import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function roomRoutes(app: FastifyInstance) {
  // POST /api/rooms/create
  app.post('/create', { preHandler: [authenticate] }, async (req, reply) => {
    const user = (req as any).user;
    const body = (req.body || {}) as {
      maxParticipants?: number;
      answerTimeSecs?: number;
      votingTimeSecs?: number;
      questionsPerTurn?: number;
    };

    // Guard: verify the user from the JWT still exists in DB.
    // Handles stale tokens (e.g. DB was reset in dev, or account deleted).
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
    if (!dbUser) {
      return reply.status(401).send({ error: 'Session expired — please log in again' });
    }

    let roomCode: string;
    let exists = true;
    // Ensure unique code
    do {
      roomCode = generateRoomCode();
      const r = await prisma.room.findUnique({ where: { roomCode } });
      exists = !!r;
    } while (exists);

    const room = await prisma.room.create({
      data: {
        roomCode,
        hostId: user.id,
        maxParticipants: body.maxParticipants ?? 5,
        answerTimeSecs: body.answerTimeSecs ?? 180,
        votingTimeSecs: body.votingTimeSecs ?? 60,
        questionsPerTurn: body.questionsPerTurn ?? 2,
      },
    });

    return reply.status(201).send({ room });
  });


  // GET /api/rooms/:code
  app.get('/:code', { preHandler: [authenticate] }, async (req, reply) => {
    const { code } = req.params as { code: string };
    const room = await prisma.room.findUnique({
      where: { roomCode: code.toUpperCase() },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { seatOrder: 'asc' },
        },
        host: { select: { id: true, name: true } },
      },
    });

    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }
    if (room.status === 'completed') {
      return reply.status(410).send({ error: 'This session has already ended' });
    }

    return reply.send({ room });
  });

  // GET /api/rooms/:code/results
  app.get('/:code/results', { preHandler: [authenticate] }, async (req, reply) => {
    const { code } = req.params as { code: string };
    const room = await prisma.room.findUnique({
      where: { roomCode: code.toUpperCase() },
      include: {
        sessionResults: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { rank: 'asc' },
        },
        awardVotes: true,
      },
    });

    if (!room) return reply.status(404).send({ error: 'Room not found' });
    return reply.send({ room });
  });
}
