import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { analyzeInterviewPerformance } from '../services/aiService';
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
}
