import type { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@peerprep/shared-types';
import { prisma } from '../config/database';

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;

// ─── Build session state object ───────────────────────────────────────────────
// Used by both interviewSocket and roomSocket (reconnect sync).
// Kept here to avoid a circular import between the two socket modules.

export async function buildSessionState(
  sessionId: string,
  candidateQuestions: any[],
  votes: Record<string, string>,
  selectedQuestion: any
) {
  const session = await prisma.interviewSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error('Session not found');

  // If candidateQuestions is empty (e.g., during reconnect), fetch from DB
  let finalCandidates = candidateQuestions;
  if (finalCandidates.length === 0 && session.phase !== 'role_selection') {
    const sessionQs = await prisma.sessionQuestion.findMany({
      where: { sessionId: session.id, isVotingQuestion: true, questionNumber: session.currentQuestionNumber },
      include: { question: true },
    });
    finalCandidates = sessionQs.map((sq: any) => sq.question);
  }

  return {
    id: session.id,
    roomId: session.roomId,
    intervieweeId: session.intervieweeId,
    intervieweeName: '',
    role: session.role as any,
    roundNumber: session.roundNumber,
    questionNumber: session.currentQuestionNumber,
    phase: session.phase as any,
    candidateQuestions: finalCandidates.map((q: any) => ({
      id: q.id,
      text: q.text,
      role: q.role,
      difficulty: q.difficulty,
    })),
    selectedQuestion,
    leadInterviewerUserId: '',
    votes,
    timerEndsAt: session.timerEndsAt ? session.timerEndsAt.toISOString() : null,
    timerDuration: 60,
  };
}

// ─── Start a new interview turn ────────────────────────────────────────────────
// Called by roomSocket (auto-start on all-ready) and interviewSocket (round rotation).
// Kept here to avoid a circular import between the two socket modules.

export async function startInterviewTurn(
  io: IoServer,
  room: any,
  roundNumber: number,
  participants: any[]
) {
  const interviewee = participants[roundNumber - 1];
  if (!interviewee) return;

  const session = await prisma.interviewSession.create({
    data: {
      roomId: room.id,
      intervieweeId: interviewee.userId,
      role: 'software_engineer', // default; overridden at role_selection
      roundNumber,
      phase: 'role_selection',
      currentQuestionNumber: 1,
      startedAt: new Date(),
    },
  });

  const sessionState = await buildSessionState(session.id, [], {}, null);
  io.to(room.roomCode).emit('interview:session_start', {
    ...sessionState,
    intervieweeId: interviewee.userId,
    intervieweeName: interviewee.user?.name ?? 'Participant',
    roundNumber,
  });
}
