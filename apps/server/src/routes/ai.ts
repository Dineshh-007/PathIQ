import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { analyzeInterviewPerformance, generateRoomSolutions } from '../services/aiService';
import { prisma } from '../config/database';

export async function aiRoutes(app: FastifyInstance) {
  // POST /api/ai/analyze
  app.post('/analyze', { preHandler: [authenticate] }, async (req, reply) => {
    const user = (req as any).user;
    const { roomId } = req.body as { roomId?: string };
    if (!roomId) return reply.status(400).send({ error: 'roomId required' });

    // Gather all question answers + evaluations for this user in this room
    const sessions = await prisma.interviewSession.findMany({
      where: { roomId, intervieweeId: user.id },
      include: {
        sessionQuestions: {
          where: { isSelected: true },
          include: {
            question: true,
            evaluations: { include: { evaluator: { select: { name: true } } } },
          },
        },
      },
    });

    if (!sessions.length) {
      return reply.status(404).send({ error: 'No interview data found for this user in this room' });
    }

    try {
      const analysis = await analyzeInterviewPerformance(user.name, sessions);

      // Persist
      await prisma.aiAnalysis.upsert({
        where: { id: `${user.id}-${roomId}` },
        update: analysis,
        create: { userId: user.id, roomId, ...analysis },
      });

      return reply.send({ analysis });
    } catch (err: any) {
      return reply.status(500).send({ error: `AI analysis failed: ${err.message}` });
    }
  });

  // POST /api/ai/solutions
  app.post('/solutions', { preHandler: [authenticate] }, async (req, reply) => {
    const { roomId } = req.body as { roomId?: string };
    if (!roomId) return reply.status(400).send({ error: 'roomId required' });

    try {
      // Gather all questions selected across all sessions in this room in chronological order
      const sessionQuestions = await prisma.sessionQuestion.findMany({
        where: {
          isSelected: true,
          session: { roomId },
        },
        include: {
          question: true,
          session: {
            include: {
              interviewee: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [
          { session: { roundNumber: 'asc' } },
          { questionNumber: 'asc' },
          { id: 'asc' },
        ],
      });

      if (sessionQuestions.length === 0) {
        return reply.send({ solutions: [] });
      }

      // Collect unique questions to pass to AI generator
      const uniqueQuestionMap = new Map<string, { id: string; text: string; role: string; difficulty: string }>();
      for (const sq of sessionQuestions) {
        if (sq.question && !uniqueQuestionMap.has(sq.question.id)) {
          uniqueQuestionMap.set(sq.question.id, {
            id: sq.question.id,
            text: sq.question.text,
            role: sq.question.role,
            difficulty: sq.question.difficulty,
          });
        }
      }

      const uniqueQuestions = Array.from(uniqueQuestionMap.values());
      const generatedSolutions = await generateRoomSolutions(roomId, uniqueQuestions);

      // Map generated solutions by questionId
      const solutionByQId = new Map<string, any>();
      for (const s of generatedSolutions) {
        solutionByQId.set(s.questionId, s);
      }

      // Return ALL session questions in chronological sequence (e.g. all 6 questions)
      const solutions = sessionQuestions.map((sq, idx) => {
        const genSol = solutionByQId.get(sq.question.id);
        return {
          sessionQuestionId: sq.id,
          questionId: sq.question.id,
          questionNumber: sq.questionNumber,
          roundNumber: sq.session.roundNumber,
          intervieweeName: sq.session.interviewee.name,
          questionText: sq.question.text,
          role: sq.question.role,
          difficulty: sq.question.difficulty,
          answerText: sq.answerText || null,
          averageScore: sq.averageScore ?? null,
          summary: genSol?.summary || `Key concepts and trade-offs for: "${sq.question.text.slice(0, 60)}..."`,
          coreConcepts: genSol?.coreConcepts || ['System Design', 'Performance', 'Trade-offs'],
          idealAnswer: genSol?.idealAnswer || 'Focus on architectural clarity, algorithmic trade-offs, and clear communication.',
          diagram: genSol?.diagram || `graph TD\n  A["Input"] --> B["Processing"]\n  B --> C["Output"]`,
          diagramCaption: genSol?.diagramCaption || 'Solution Architecture Flow',
        };
      });

      return reply.send({ solutions });
    } catch (err: any) {
      console.error('Error generating room solutions:', err);
      return reply.status(500).send({ error: `Failed to generate solutions: ${err.message}` });
    }
  });
}

