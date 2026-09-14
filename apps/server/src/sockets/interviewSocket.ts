import type { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, InterviewRole, AwardCategory } from '@peerprep/shared-types';
import { prisma } from '../config/database';
import { redisKeys } from '../config/redis';
import { fetchCandidateQuestions, selectWinningQuestion, markQuestionUsed } from '../services/questionService';
import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { buildSessionState, startInterviewTurn } from './sessionHelpers';
import { selectNextQuestion } from '../services/aiInterviewerService';

// Re-export for consumers that imported directly from this module
export { buildSessionState, startInterviewTurn };

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;

// ─── BullMQ Timer Queue ───────────────────────────────────────────────────────
const timerQueue = new Queue('interview-timers', { connection: redis });

// ─── Main Interview Socket ────────────────────────────────────────────────────
export function registerInterviewSocket(io: IoServer) {
  // BullMQ worker processes timer jobs
  const worker = new Worker(
    'interview-timers',
    async (job: Job) => {
      const { type, roomCode, sessionId, questionId, sqId, numEvaluators } = job.data;

      if (type === 'voting_timeout') {
        await handleVotingTimeout(io, roomCode, sessionId, questionId);
      } else if (type === 'answer_timeout') {
        await handleAnswerTimeout(io, roomCode, sessionId, sqId);
      } else if (type === 'eval_timeout') {
        await handleEvalTimeout(io, roomCode, sessionId, sqId, numEvaluators);
      }
    },
    { connection: redis }
  );

  worker.on('failed', (job, err) => {
    console.error(`Timer job ${job?.id} failed:`, err);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // The interview engine is triggered by the room:session_starting event
  // from the frontend which calls startInterviewSession directly
  // ─────────────────────────────────────────────────────────────────────────

  io.on('connection', (socket) => {
    let roomCode: string | null = null;
    let userId: string | null = null;

    // Attach roomCode/userId from socket handshake data (set during room:join)
    socket.on('room:join', ({ roomCode: rc }) => {
      roomCode = rc.toUpperCase();
    });

    // ── Session start (handled securely in roomSocket.ts) ─────────

    // ── Role Selection ─────────────────────────────────────────────────────
    socket.on('interview:select_role', async ({ role }) => {
      try {
        if (!roomCode) return;
        const room = await prisma.room.findUnique({ where: { roomCode } });
        if (!room) return;

      // Find the active session for this room
      const session = await prisma.interviewSession.findFirst({
        where: { roomId: room.id, phase: 'role_selection' },
      });
      if (!session) return;

      // Verify socket user is the current interviewee
      const socketUserId = getSocketUserId(socket);
      if (session.intervieweeId !== socketUserId) return;

      // Fetch 5 candidate questions
      const questions = await fetchCandidateQuestions(role as InterviewRole, room.id, session.intervieweeId);

      // Store voting question options in session
      await prisma.sessionQuestion.createMany({
      data: questions.map((q: { id: string; questionNumber?: number }) => ({
          sessionId: session.id,
          questionId: q.id,
          questionNumber: 1, // 1 = first round
          isVotingQuestion: true,
          isSelected: false,
        })),
      });

      // Update session with timer and phase now that questions are stored
      const delay = (room.votingTimeSecs ?? 60) * 1000;
      const timerEndsAt = new Date(Date.now() + delay).toISOString();
      const updatedSessionDB = await prisma.interviewSession.update({
        where: { id: session.id },
        data: { role, phase: 'voting', timerEndsAt: new Date(timerEndsAt) },
      });

        // Emit to all interviewers (NOT the interviewee specifically)
        // Send current voting session state
        const updatedSession = await buildSessionState(session.id, questions, {}, null);
        console.log('[DEBUG] interview:voting_start payload candidateQuestions length:', updatedSession.candidateQuestions?.length);
        io.to(roomCode).emit('interview:role_selected', { role: role as InterviewRole });
        io.to(roomCode).emit('interview:voting_start', updatedSession);

        // --- AI INTERVIEWER V1 ---
        // Asynchronously call AI selection instead of scheduling voting timeout
        handleAISelection(io, room, updatedSessionDB, roomCode, questions).catch(err => {
          console.error('[AI Selection Error]', err);
        });
      } catch (error: any) {
        console.error('interview:select_role error:', error);
        socket.emit('error', 'Failed to select role');
      }
    });

    // ── Vote on question ───────────────────────────────────────────────────
    socket.on('interview:vote', async ({ questionId }) => {
      // V1 AI Interviewer: Human voting is disabled.
      socket.emit('error', 'Human voting is disabled. The AI is selecting the question.');
    });

    // ── Answer done early / Submitted Text Answer ─────────────────────────
    socket.on('interview:answer_done', async ({ answerText }: { answerText?: string } = {}) => {
      try {
        if (!roomCode) return;
      const room = await prisma.room.findUnique({ where: { roomCode } });
      if (!room) return;

      const session = await prisma.interviewSession.findFirst({
        where: { roomId: room.id, phase: 'answering' },
      });
      if (!session) return;

      const socketUserId = getSocketUserId(socket);
      if (session.intervieweeId !== socketUserId) return; // only interviewee

      // Find the active SessionQuestion to save the typed answer text
      const activeSQ = await prisma.sessionQuestion.findFirst({
        where: { sessionId: session.id, isSelected: true, questionNumber: session.currentQuestionNumber },
      });

      if (activeSQ && answerText) {
        await prisma.sessionQuestion.update({
          where: { id: activeSQ.id },
          data: { answerText },
        });
      }

        // Remove the pending timer and trigger evaluation phase
        await timerQueue.remove(`answer-${session.id}-${session.currentQuestionNumber}`);
        await startEvaluationPhase(io, room, session, roomCode);
      } catch (error: any) {
        console.error('interview:answer_done error:', error);
        socket.emit('error', 'Failed to submit answer');
      }
    });

    // ── Submit evaluation ──────────────────────────────────────────────────
    socket.on('evaluation:submit', async ({ sessionQuestionId, score, feedback }) => {
      try {
        if (!roomCode) return;
        if (score < 1 || score > 10) return;

      const room = await prisma.room.findUnique({ where: { roomCode } });
      if (!room) return;

      const session = await prisma.interviewSession.findFirst({
        where: { roomId: room.id, phase: 'evaluating' },
      });
      if (!session) return;

      const socketUserId = getSocketUserId(socket);
      if (session.intervieweeId === socketUserId) return; // interviewee cannot evaluate

      // Find the true SessionQuestion (frontend passes the base Question ID)
      const sq = await prisma.sessionQuestion.findFirst({
        where: { sessionId: session.id, questionId: sessionQuestionId, questionNumber: session.currentQuestionNumber }
      });
      if (!sq) return;
      
      const realSessionQuestionId = sq.id;

      // Upsert evaluation
      await prisma.evaluation.upsert({
        where: { sessionQuestionId_evaluatorId: { sessionQuestionId: realSessionQuestionId, evaluatorId: socketUserId } },
        update: { score, feedback },
        create: { sessionQuestionId: realSessionQuestionId, evaluatorId: socketUserId, score, feedback },
      });

      // Count submitted evaluations
      const submitted = await prisma.evaluation.count({ where: { sessionQuestionId: realSessionQuestionId } });
      const numInterviewers = (await prisma.roomParticipant.count({ where: { roomId: room.id } })) - 1;

      io.to(roomCode).emit('interview:evaluation_progress', { submitted, total: numInterviewers });

      // All evaluators submitted — reveal
      if (submitted >= numInterviewers) {
        await timerQueue.remove(`eval-${session.id}-${session.currentQuestionNumber}`);
        await revealScores(io, room, session, realSessionQuestionId, roomCode);
      }
      } catch (error: any) {
        console.error('evaluation:submit error:', error);
        socket.emit('error', 'Failed to submit evaluation');
      }
    });

    // ── Award votes ────────────────────────────────────────────────────────
    socket.on('awards:vote', async ({ nomineeId, category }) => {
      try {
        if (!roomCode) return;
      const room = await prisma.room.findUnique({ where: { roomCode } });
      if (!room) return;

      const socketUserId = getSocketUserId(socket);
      if (socketUserId === nomineeId) {
        socket.emit('error', 'You cannot vote for yourself');
        return;
      }

        await prisma.awardVote.upsert({
          where: { roomId_voterId_category: { roomId: room.id, voterId: socketUserId, category: category as any } },
          update: { nomineeId },
          create: { roomId: room.id, voterId: socketUserId, nomineeId, category: category as any },
        });

        io.to(roomCode).emit('awards:vote_cast', { category, count: 1 });
      } catch (error: any) {
        console.error('awards:vote error:', error);
        socket.emit('error', 'Failed to cast award vote');
      }
    });

    socket.on('awards:submit_all', async () => {
      try {
        if (!roomCode) return;
      const room = await prisma.room.findUnique({
        where: { roomCode },
        include: { participants: true },
      });
      if (!room) return;

      const AWARD_CATEGORIES: AwardCategory[] = [
        'best_technical', 'best_communicator', 'best_critical_thinker', 'best_interviewer',
      ];

      // Count how many participants have voted for all categories
      const votesByUser = await prisma.awardVote.groupBy({
        by: ['voterId'],
        where: { roomId: room.id },
        _count: { category: true },
      });
      const allSubmitted = votesByUser.filter((v: { _count: { category: number } }) => v._count.category >= AWARD_CATEGORIES.length);

      if (allSubmitted.length >= room.participants.length) {
        // ── Bug fix: Redis SET NX lock prevents concurrent calls from multiple
        // sockets all passing the check above and calling computeAndEmitResults
        // at the same time, which would cause duplicate DB writes + socket emissions.
          const lockKey = `results_lock:${room.id}`;
          const acquired = await redis.set(lockKey, '1', 'EX', 30, 'NX');
          if (!acquired) return; // another socket already won the lock

          await computeAndEmitResults(io, room, roomCode);
        }
      } catch (error: any) {
        console.error('awards:submit_all error:', error);
        socket.emit('error', 'Failed to submit awards');
      }
    });
  });
}

// ─── Voting timeout handler ────────────────────────────────────────────────────
async function handleVotingTimeout(io: IoServer, roomCode: string, sessionId: string, questionIds: string[]) {
  const room = await prisma.room.findUnique({ where: { roomCode } });
  if (!room) return;

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: { sessionQuestions: { where: { isVotingQuestion: true }, include: { votes: true } } },
  });
  if (!session || session.phase !== 'voting') return;

  await resolveVoting(io, room, session, roomCode);
}

async function resolveVoting(io: IoServer, room: any, session: any, roomCode: string) {
  // Prevent race conditions between timeout and late vote submissions
  const lockKey = `voting_lock:${session.id}:${session.currentQuestionNumber}`;
  const acquired = await redis.set(lockKey, '1', 'EX', 30, 'NX');
  if (!acquired) return; // another process is already resolving voting

  // Always fetch fresh to guarantee votes are included
  const votingQuestions = await prisma.sessionQuestion.findMany({
    where: { sessionId: session.id, isVotingQuestion: true, questionNumber: session.currentQuestionNumber },
    include: { votes: true },
  });

  // Build votes map
  const votesMap: Record<string, string> = {};
  for (const sq of votingQuestions) {
    for (const v of sq.votes) {
      votesMap[v.voterId] = sq.questionId;
    }
  }

  const winnerId = selectWinningQuestion(votesMap, votingQuestions.map((sq: any) => sq.questionId));
  const winner = await prisma.question.findUnique({ where: { id: winnerId } });
  if (!winner) return;

  // Mark winner as selected
  await prisma.sessionQuestion.updateMany({
    where: { sessionId: session.id, isVotingQuestion: true, questionId: winnerId, questionNumber: session.currentQuestionNumber },
    data: { isSelected: true },
  });
  await markQuestionUsed(winnerId);

  const winnerSQ = votingQuestions.find((sq: any) => sq.questionId === winnerId);

  io.to(roomCode).emit('interview:question_selected', {
    id: winner.id,
    text: winner.text,
    role: winner.role as any,
    difficulty: winner.difficulty as any,
  });

  // Determine lead interviewer (round-robin by seatOrder)
  const participants = await prisma.roomParticipant.findMany({
    where: { roomId: room.id },
    orderBy: { seatOrder: 'asc' },
  });
  const interviewers = participants.filter((p: any) => p.userId !== session.intervieweeId);
  const qNum = session.currentQuestionNumber;
  const leadIdx = (session.roundNumber + qNum - 1) % interviewers.length;
  const leadInterviewer = interviewers[leadIdx];

  // Start answer phase
  const delay = (room.answerTimeSecs ?? 180) * 1000;
  const timerEndsAt = new Date(Date.now() + delay).toISOString();

  await prisma.interviewSession.update({
    where: { id: session.id },
    data: { phase: 'answering', timerEndsAt: new Date(timerEndsAt) },
  });

  if (winnerSQ) {
    await prisma.sessionQuestion.update({
      where: { id: winnerSQ.id },
      data: { answerStartedAt: new Date(), questionNumber: session.currentQuestionNumber },
    });
  }

  io.to(roomCode).emit('interview:answer_start', {
    timerEndsAt,
    leadInterviewerUserId: leadInterviewer?.userId ?? '',
  });

  // Schedule server-side answer timeout
  await timerQueue.add(
    'answer_timeout',
    { type: 'answer_timeout', roomCode, sessionId: session.id, sqId: winnerSQ?.id },
    { delay, jobId: `answer-${session.id}-${session.currentQuestionNumber}` }
  );
}

// --- AI INTERVIEWER V1 LOGIC ---
async function handleAISelection(io: IoServer, room: any, session: any, roomCode: string, candidateQuestions: any[]) {
  // 1. Fetch previous QA for context
  const previousSQs = await prisma.sessionQuestion.findMany({
    where: { sessionId: session.id, isSelected: true, questionNumber: { lt: session.currentQuestionNumber } },
    include: { question: true }
  });
  
  const previousQAs = previousSQs.map((sq: any) => ({
    question: sq.question.text,
    answer: sq.answerText
  }));

  // 2. Call Gemini
  const selectedQuestionId = await selectNextQuestion(
    session.id,
    session.role,
    candidateQuestions,
    previousQAs
  );

  // 3. Mark winner as selected
  const winner = await prisma.question.findUnique({ where: { id: selectedQuestionId } });
  if (!winner) return;

  await prisma.sessionQuestion.updateMany({
    where: { sessionId: session.id, isVotingQuestion: true, questionId: selectedQuestionId, questionNumber: session.currentQuestionNumber },
    data: { isSelected: true },
  });
  await markQuestionUsed(selectedQuestionId);

  const votingQuestions = await prisma.sessionQuestion.findMany({
    where: { sessionId: session.id, isVotingQuestion: true, questionNumber: session.currentQuestionNumber },
  });
  const winnerSQ = votingQuestions.find((sq: any) => sq.questionId === selectedQuestionId);

  io.to(roomCode).emit('interview:question_selected', {
    id: winner.id,
    text: winner.text,
    role: winner.role as any,
    difficulty: winner.difficulty as any,
  });

  // 4. Determine lead interviewer
  const participants = await prisma.roomParticipant.findMany({
    where: { roomId: room.id },
    orderBy: { seatOrder: 'asc' },
  });
  const interviewers = participants.filter((p: any) => p.userId !== session.intervieweeId);
  const qNum = session.currentQuestionNumber;
  const leadIdx = (session.roundNumber + qNum - 1) % interviewers.length;
  const leadInterviewer = interviewers[leadIdx];

  // 5. Start answer phase
  const delay = (room.answerTimeSecs ?? 180) * 1000;
  const timerEndsAt = new Date(Date.now() + delay).toISOString();

  await prisma.interviewSession.update({
    where: { id: session.id },
    data: { phase: 'answering', timerEndsAt: new Date(timerEndsAt) },
  });

  if (winnerSQ) {
    await prisma.sessionQuestion.update({
      where: { id: winnerSQ.id },
      data: { answerStartedAt: new Date(), questionNumber: session.currentQuestionNumber },
    });
  }

  io.to(roomCode).emit('interview:answer_start', {
    timerEndsAt,
    leadInterviewerUserId: leadInterviewer?.userId ?? '',
  });

  // Schedule server-side answer timeout
  await timerQueue.add(
    'answer_timeout',
    { type: 'answer_timeout', roomCode, sessionId: session.id, sqId: winnerSQ?.id },
    { delay, jobId: `answer-${session.id}-${session.currentQuestionNumber}` }
  );
}

// ─── Answer timeout handler ────────────────────────────────────────────────────
async function handleAnswerTimeout(io: IoServer, roomCode: string, sessionId: string, sqId: string) {
  const room = await prisma.room.findUnique({ where: { roomCode } });
  const session = await prisma.interviewSession.findUnique({ where: { id: sessionId } });
  if (!room || !session || session.phase !== 'answering') return;

  await startEvaluationPhase(io, room, session, roomCode);
}

// ─── Start evaluation phase ────────────────────────────────────────────────────
async function startEvaluationPhase(io: IoServer, room: any, session: any, roomCode: string) {
  // Prevent race conditions between timeout and early answering submission
  const lockKey = `answer_lock:${session.id}:${session.currentQuestionNumber}`;
  const acquired = await redis.set(lockKey, '1', 'EX', 30, 'NX');
  if (!acquired) return; // another process is already starting evaluation

  // Mark answer as ended
  const activeSQ = await prisma.sessionQuestion.findFirst({
    where: { sessionId: session.id, isSelected: true, questionNumber: session.currentQuestionNumber, answerStartedAt: { not: null }, answerEndedAt: null },
  });
  if (activeSQ) {
    await prisma.sessionQuestion.update({
      where: { id: activeSQ.id },
      data: { answerEndedAt: new Date() },
    });
  }

  // Calculate explicit timer bound
  const evalDelay = 40 * 1000; // 40 seconds
  const timerEndsAt = new Date(Date.now() + evalDelay);

  await prisma.interviewSession.update({
    where: { id: session.id },
    data: { phase: 'evaluating', timerEndsAt },
  });

  io.to(roomCode).emit('interview:answer_end');
  io.to(roomCode).emit('interview:evaluation_start', { answerText: activeSQ?.answerText ?? '' });

  const numInterviewers = (await prisma.roomParticipant.count({ where: { roomId: room.id } })) - 1;
  await timerQueue.add(
    'eval_timeout',
    { type: 'eval_timeout', roomCode, sessionId: session.id, sqId: activeSQ?.id, numEvaluators: numInterviewers },
    { delay: evalDelay, jobId: `eval-${session.id}-${session.currentQuestionNumber}` }
  );
}

// ─── Reveal scores ─────────────────────────────────────────────────────────────
async function revealScores(io: IoServer, room: any, session: any, sqId: string, roomCode: string) {
  // Prevent race conditions between timeout and late evaluation submissions
  const lockKey = `reveal_lock:${session.id}:${session.currentQuestionNumber}`;
  const acquired = await redis.set(lockKey, '1', 'EX', 30, 'NX');
  if (!acquired) return; // another process is already revealing scores

  const evaluations = await prisma.evaluation.findMany({
    where: { sessionQuestionId: sqId },
    include: { evaluator: { select: { id: true, name: true } } },
  });

  const avgScore = evaluations.reduce((a: number, e: { score: number }) => a + e.score, 0) / (evaluations.length || 1);

  await prisma.sessionQuestion.update({
    where: { id: sqId },
    data: { averageScore: avgScore },
  });

  io.to(roomCode).emit('interview:scores_revealed', {
    sessionQuestionId: sqId,
    evaluations: evaluations.map((e: { evaluatorId: string; evaluator: { name: string }; score: number; feedback: string }) => ({
      evaluatorId: e.evaluatorId,
      evaluatorName: e.evaluator.name,
      score: e.score,
      feedback: e.feedback,
    })),
    averageScore: avgScore,
  });

  // Advance to next question or next turn
  await advanceSession(io, room, session, roomCode);
}

// ─── Eval timeout handler ──────────────────────────────────────────────────────
async function handleEvalTimeout(io: IoServer, roomCode: string, sessionId: string, sqId: string, numEvaluators: number) {
  const room = await prisma.room.findUnique({ where: { roomCode } });
  const session = await prisma.interviewSession.findUnique({ where: { id: sessionId } });
  if (!room || !session) return;
  await revealScores(io, room, session, sqId, roomCode);
}

// ─── Advance session state machine ────────────────────────────────────────────
async function advanceSession(io: IoServer, room: any, session: any, roomCode: string) {
  const questionsPerTurn = room.questionsPerTurn ?? 2;
  const nextQNum = session.currentQuestionNumber + 1;

  if (nextQNum <= questionsPerTurn) {
    const delay = (room.votingTimeSecs ?? 60) * 1000;
    const timerEndsAt = new Date(Date.now() + delay);

    const questions = await fetchCandidateQuestions(session.role, room.id, session.intervieweeId);

    await prisma.sessionQuestion.createMany({
      data: questions.map((q: { id: string }) => ({
        sessionId: session.id,
        questionId: q.id,
        questionNumber: nextQNum,
        isVotingQuestion: true,
        isSelected: false,
      })),
    });

    // Next question — update phase to voting now that questions are stored
    const updatedSessionDB = await prisma.interviewSession.update({
      where: { id: session.id },
      data: { phase: 'voting', currentQuestionNumber: nextQNum, timerEndsAt },
    });

    const updatedSession = await buildSessionState(session.id, questions, {}, null);
    io.to(roomCode).emit('interview:voting_start', updatedSession);

    // --- AI INTERVIEWER V1 ---
    handleAISelection(io, room, updatedSessionDB, roomCode, questions).catch(err => {
      console.error('[AI Selection Error]', err);
    });
  } else {
    // Turn complete — compute average and rotate
    const allSQs = await prisma.sessionQuestion.findMany({
      where: { sessionId: session.id, isSelected: true },
    });
    const turnAvg = allSQs.reduce((a: number, sq: { averageScore: number | null }) => a + (sq.averageScore ?? 0), 0) / (allSQs.length || 1);

    await prisma.interviewSession.update({
      where: { id: session.id },
      data: { phase: 'completed', completedAt: new Date(), averageScore: turnAvg },
    });

    io.to(roomCode).emit('interview:turn_complete', { averageScore: turnAvg });

    // Check if more turns remain
    const participants = await prisma.roomParticipant.findMany({
      where: { roomId: room.id },
      include: { user: true },
      orderBy: { seatOrder: 'asc' },
    });

    const completedSessions = await prisma.interviewSession.count({
      where: { roomId: room.id, phase: 'completed' },
    });

    if (completedSessions >= participants.length) {
      // All turns done — move to awards
      io.to(roomCode).emit('awards:voting_start');
    } else {
      // Start next turn
      await startInterviewTurn(io, room, session.roundNumber + 1, participants);
    }
  }
}

// startInterviewTurn has been moved to sessionHelpers.ts to break the circular
// dependency with roomSocket.ts. It is re-exported at the top of this file.

// ─── Compute final results ─────────────────────────────────────────────────────
async function computeAndEmitResults(io: IoServer, room: any, roomCode: string) {
  const sessions = await prisma.interviewSession.findMany({
    where: { roomId: room.id, phase: 'completed' },
    include: {
      sessionQuestions: {
        where: { isSelected: true },
        include: {
          question: true,
          evaluations: {
            include: { evaluator: { select: { name: true } } }
          }
        }
      }
    },
    orderBy: { roundNumber: 'asc' },
  });

  const awardVotes = await prisma.awardVote.findMany({ where: { roomId: room.id } });

  // Tally awards
  const awardTally: Record<string, Record<string, number>> = {};
  for (const vote of awardVotes) {
    if (!awardTally[vote.category]) awardTally[vote.category] = {};
    awardTally[vote.category][vote.nomineeId] =
      (awardTally[vote.category][vote.nomineeId] ?? 0) + 1;
  }
  const awardWinners: Record<string, string> = {};
  for (const [cat, tallies] of Object.entries(awardTally)) {
    awardWinners[cat] = Object.entries(tallies).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '';
  }

  // Build participant results
  const participants = await prisma.roomParticipant.findMany({
    where: { roomId: room.id },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { seatOrder: 'asc' },
  });

  const results = sessions.map((s: { intervieweeId: string; averageScore: number | null }) => ({
    userId: s.intervieweeId,
    averageScore: s.averageScore ?? 0,
    totalScore: (s.averageScore ?? 0) * (room.questionsPerTurn ?? 2),
  }));
  results.sort((a: { averageScore: number }, b: { averageScore: number }) => b.averageScore - a.averageScore);
  const ranked = results.map((r: { userId: string; averageScore: number; totalScore: number }, i: number) => ({ ...r, rank: i + 1 }));

  // Persist results
  for (const r of ranked) {
    const awardsReceived = Object.entries(awardWinners)
      .filter(([, uid]) => uid === r.userId)
      .map(([cat]) => cat as AwardCategory);
    await prisma.sessionResult.upsert({
      where: { roomId_userId: { roomId: room.id, userId: r.userId } },
      update: { totalScore: r.totalScore, averageScore: r.averageScore, rank: r.rank, awardsReceived },
      create: {
        roomId: room.id,
        userId: r.userId,
        totalScore: r.totalScore,
        averageScore: r.averageScore,
        rank: r.rank,
        awardsReceived,
      },
    });
  }

  await prisma.room.update({ where: { id: room.id }, data: { status: 'completed', endedAt: new Date() } });

  // Emit results
  const participantResults = ranked.map((r: { userId: string; averageScore: number; totalScore: number; rank: number }) => {
    const p = participants.find((pt: any) => pt.userId === r.userId);
    const awardsReceived = Object.entries(awardWinners)
      .filter(([, uid]) => uid === r.userId)
      .map(([cat]) => cat as AwardCategory);
    const session = sessions.find((s: any) => s.intervieweeId === r.userId);
    
    const questionScores = session?.sessionQuestions.map((sq: any) => ({
      questionId: sq.questionId,
      questionText: sq.question?.text ?? 'Unknown Question',
      average: sq.averageScore ?? 0,
    })) ?? [];

    const feedbackReceived = session?.sessionQuestions.flatMap((sq: any) =>
      sq.evaluations.map((e: any) => ({
        evaluatorId: e.evaluatorId,
        evaluatorName: e.evaluator?.name ?? 'Interviewer',
        score: e.score,
        feedback: e.feedback,
      }))
    ) ?? [];

    return {
      userId: r.userId,
      name: p?.user.name ?? 'Unknown',
      avatarUrl: p?.user.avatarUrl ?? undefined,
      totalScore: r.totalScore,
      averageScore: r.averageScore,
      rank: r.rank,
      questionScores,
      feedbackReceived,
      awardsReceived,
    };
  });

  io.to(roomCode).emit('results:ready', {
    roomId: room.id,
    participants: participantResults,
    awardWinners: awardWinners as any,
    completedAt: new Date().toISOString(),
  });
}

// buildSessionState has been moved to sessionHelpers.ts to break the circular
// dependency with roomSocket.ts. It is re-exported at the top of this file.

// ─── Helper: get userId from socket (handshake query) ─────────────────────────
function getSocketUserId(socket: any): string {
  return (socket as any)._userId ?? socket.handshake.query.userId ?? '';
}
