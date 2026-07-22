import { prisma } from '../config/database';
import type { InterviewRole } from '@peerprep/shared-types';

/**
 * Fetch 5 random role-appropriate questions,
 * excluding those already shown to this user in this room.
 */
export async function fetchCandidateQuestions(
  role: InterviewRole,
  roomId: string,
  userId: string
) {
  // Load IDs of questions already used for this user in this room
  const usedSessions = await prisma.interviewSession.findMany({
    where: { roomId, intervieweeId: userId },
    include: { sessionQuestions: { select: { questionId: true } } },
  });

  const usedIds = usedSessions
    .flatMap((s: { sessionQuestions: { questionId: string }[] }) =>
      s.sessionQuestions.map((sq: { questionId: string }) => sq.questionId)
    );

  // Query approved questions for this role, excluding used ones
  const questions = await prisma.question.findMany({
    where: {
      role,
      approved: true,
      id: { notIn: usedIds.length ? usedIds : ['__none__'] },
    },
    orderBy: { usageCount: 'asc' }, // prefer less-used questions
    take: 5,
  });

  // If not enough unique questions, fall back without exclusion
  let finalQuestions = questions;
  if (questions.length < 5) {
    const fallback = await prisma.question.findMany({
      where: { role, approved: true },
      orderBy: { usageCount: 'asc' },
      take: 5,
    });
    finalQuestions = fallback;
  }

  // If DB is literally completely empty, inject dummy questions
  if (finalQuestions.length === 0) {
    const dummyQuestions = [
      { text: 'Tell me about yourself.', role, difficulty: 'easy' as const, approved: true },
      { text: 'What is your greatest strength?', role, difficulty: 'easy' as const, approved: true },
      { text: 'Describe a challenging project.', role, difficulty: 'medium' as const, approved: true },
      { text: 'How do you handle conflict?', role, difficulty: 'medium' as const, approved: true },
      { text: 'Where do you see yourself in 5 years?', role, difficulty: 'easy' as const, approved: true },
    ];
    
    await prisma.question.createMany({
      data: dummyQuestions,
      skipDuplicates: true,
    });
    
    finalQuestions = await prisma.question.findMany({
      where: { role, approved: true },
      take: 5,
    });
  }

  return finalQuestions;
}

/** Pick the winning question from votes map { userId: questionId } */
export function selectWinningQuestion(
  votes: Record<string, string>,
  candidateIds: string[]
): string {
  const tally: Record<string, number> = {};
  for (const qId of Object.values(votes)) {
    tally[qId] = (tally[qId] ?? 0) + 1;
  }

  // Among voted candidates only
  let winner = candidateIds[0]; // FIFO tiebreak: first in list wins
  let maxVotes = 0;

  for (const qId of candidateIds) {
    const count = tally[qId] ?? 0;
    if (count > maxVotes) {
      maxVotes = count;
      winner = qId;
    }
  }

  return winner;
}

/** Increment usage count after a question is selected */
export async function markQuestionUsed(questionId: string) {
  await prisma.question.update({
    where: { id: questionId },
    data: { usageCount: { increment: 1 } },
  });
}
