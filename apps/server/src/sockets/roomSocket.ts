import type { Server, Socket } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@peerprep/shared-types';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { verifySocketToken } from '../middleware/auth';
import { buildSessionState, startInterviewTurn } from './sessionHelpers';

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerRoomSocket(io: IoServer) {
  io.on('connection', async (socket: IoSocket) => {
    let currentRoomCode: string | null = null;
    let currentUserId: string | null = null;

    // ─── Join Room ────────────────────────────────────────────────────────────
    socket.on('room:join', async ({ roomCode, token }) => {
      try {
      const payload = verifySocketToken(token);
      if (!payload) {
        socket.emit('error', 'Authentication failed');
        return;
      }

      currentUserId = payload.id;
      (socket as any)._userId = payload.id;
      currentRoomCode = roomCode.toUpperCase();

      const room = await prisma.room.findUnique({
        where: { roomCode: currentRoomCode },
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            orderBy: { seatOrder: 'asc' },
          },
        },
      });

      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }

      if (room.status === 'completed') {
        socket.emit('error', 'This session has already ended');
        return;
      }

      // Check if already a participant (reconnecting)
      const existing = room.participants.find((p: { userId: string }) => p.userId === payload.id);

      if (!existing) {
        if (room.participants.length >= room.maxParticipants) {
          socket.emit('error', 'Room is full');
          return;
        }

        // Assign next seat order
        const seatOrder = room.participants.length + 1;
        await prisma.roomParticipant.create({
          data: {
            roomId: room.id,
            userId: payload.id,
            seatOrder,
            socketId: socket.id,
          },
        });
      } else {
        // Reconnecting — update socket ID and connection status
        await prisma.roomParticipant.update({
          where: { roomId_userId: { roomId: room.id, userId: payload.id } },
          data: { isConnected: true, socketId: socket.id },
        });
        io.to(currentRoomCode).emit('room:participant_reconnected', payload.id);
      }

      socket.join(currentRoomCode);

      // Broadcast updated room state
      const updatedRoom = await getFullRoomState(room.id);
      socket.emit('room:state', updatedRoom);
      socket.to(currentRoomCode).emit('room:state', updatedRoom);

      // ── NEW: Re-sync interview session if active ──────────────────
      if (room.status === 'active') {
        const activeSession = await prisma.interviewSession.findFirst({
          where: { roomId: room.id, phase: { not: 'completed' } },
        });

        if (activeSession) {
          let candidateQuestions: any[] = [];
          let selectedQuestion: any = null;
          let votes: Record<string, string> = {};

          const sessionQs = await prisma.sessionQuestion.findMany({
            where: { sessionId: activeSession.id },
            include: { question: true, votes: true },
          });

          if (activeSession.phase === 'voting') {
            candidateQuestions = sessionQs.filter(sq => sq.isVotingQuestion && sq.questionNumber === activeSession.currentQuestionNumber).map(sq => sq.question);
            for (const sq of sessionQs.filter(sq => sq.questionNumber === activeSession.currentQuestionNumber)) {
              for (const vote of sq.votes) {
                votes[vote.voterId] = sq.questionId;
              }
            }
          } else if (['answering', 'evaluating', 'reveal'].includes(activeSession.phase)) {
            const sq = sessionQs.find(sq => sq.isSelected && sq.questionNumber === activeSession.currentQuestionNumber);
            if (sq) {
              selectedQuestion = sq.question;
              (selectedQuestion as any).answerText = sq.answerText;
            }
          }

          // buildSessionState is imported from sessionHelpers (no circular dep)
          // timerEndsAt is already set from the DB by buildSessionState
          const sessionState = await buildSessionState(activeSession.id, candidateQuestions, votes, selectedQuestion);
          socket.emit('interview:reconnect_sync', sessionState);
        }
      }

      if (!existing) {
        io.to(currentRoomCode).emit('notification', {
          type: 'info',
          message: `${payload.name} joined the room`,
        });
      }
      } catch (err: any) {
        console.error('[room:join] Unhandled error:', err?.message ?? err);
        socket.emit('error', 'Failed to join room. Please refresh and try again.');
      }
    });

    // ─── Ready Toggle ─────────────────────────────────────────────────────────
    socket.on('room:ready', async () => {
      if (!currentRoomCode || !currentUserId) return;

      const room = await prisma.room.findUnique({ where: { roomCode: currentRoomCode } });
      if (!room) return;

      await prisma.roomParticipant.update({
        where: { roomId_userId: { roomId: room.id, userId: currentUserId } },
        data: { isReady: true },
      });

      io.to(currentRoomCode).emit('room:participant_ready', currentUserId);

      // Check auto-start: all participants ready
      const participants = await prisma.roomParticipant.findMany({
        where: { roomId: room.id },
      });
      const allReady = participants.every((p: { isReady: boolean }) => p.isReady);
      if (allReady && participants.length >= 2) {
        await prisma.room.update({
          where: { id: room.id },
          data: { status: 'active', startedAt: new Date() },
        });
        io.to(currentRoomCode).emit('room:session_starting');

        // startInterviewTurn is imported from sessionHelpers (no circular dep)
        await startInterviewTurn(io, room, 1, participants);
      }
    });

    // ─── Host Start Override ──────────────────────────────────────────────────
    socket.on('room:start', async () => {
      if (!currentRoomCode || !currentUserId) return;

      const room = await prisma.room.findUnique({ where: { roomCode: currentRoomCode } });
      if (!room || room.hostId !== currentUserId) {
        socket.emit('error', 'Only the host can start the session');
        return;
      }

      const participants = await prisma.roomParticipant.findMany({
        where: { roomId: room.id, isConnected: true },
        include: { user: true },
        orderBy: { seatOrder: 'asc' },
      });

      if (participants.length < 2) {
        socket.emit('error', 'Need at least 2 participants to start');
        return;
      }

      await prisma.room.update({
        where: { id: room.id },
        data: { status: 'active', startedAt: new Date() },
      });

      io.to(currentRoomCode).emit('room:session_starting');

      // Start first interviewee's turn
      await startInterviewTurn(io, room, 1, participants);
    });

    // ─── Leave Room Explicitly ────────────────────────────────────────────────
    socket.on('room:leave', async () => {
      if (!currentRoomCode || !currentUserId) return;

      const room = await prisma.room.findUnique({ where: { roomCode: currentRoomCode } });
      if (!room) return;

      if (room.hostId === currentUserId) {
        await prisma.room.update({
          where: { id: room.id },
          data: { status: 'completed' },
        });
        io.to(currentRoomCode).emit('notification', {
          type: 'warning',
          message: 'The host has ended the room.',
        });
        io.to(currentRoomCode).emit('room:ended');
      } else {
        try {
          await prisma.roomParticipant.delete({
            where: { roomId_userId: { roomId: room.id, userId: currentUserId } },
          });
          io.to(currentRoomCode).emit('notification', {
            type: 'info',
            message: 'A participant left the room.',
          });
          const updatedRoom = await getFullRoomState(room.id);
          io.to(currentRoomCode).emit('room:state', updatedRoom);
        } catch (e) {
          // ignore if already deleted
        }
      }
      
      socket.leave(currentRoomCode);
      currentRoomCode = null;
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      if (!currentRoomCode || !currentUserId) return;

      const room = await prisma.room.findUnique({ where: { roomCode: currentRoomCode } });
      if (!room) return;

      await prisma.roomParticipant.update({
        where: { roomId_userId: { roomId: room.id, userId: currentUserId } },
        data: { isConnected: false },
      });

      io.to(currentRoomCode).emit('room:participant_left', currentUserId);

      // Store disconnect time in Redis for reconnection window tracking
      await redis.setex(
        `disconnect:${room.id}:${currentUserId}`,
        60, // 60s reconnection window
        Date.now().toString()
      );
    });
  });
}

// ─── Helper: Build full room state ───────────────────────────────────────────

async function getFullRoomState(roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { seatOrder: 'asc' },
      },
      host: { select: { id: true, name: true } },
    },
  });

  if (!room) throw new Error('Room not found');

  return {
    id: room.id,
    roomCode: room.roomCode,
    hostId: room.hostId,
    status: room.status,
    maxParticipants: room.maxParticipants,
    participants: room.participants.map((p: { userId: string; seatOrder: number; isConnected: boolean; isReady: boolean; user: { name: string; avatarUrl: string | null } }) => ({
      userId: p.userId,
      name: p.user.name,
      avatarUrl: p.user.avatarUrl ?? undefined,
      seatOrder: p.seatOrder,
      isConnected: p.isConnected,
      isReady: p.isReady,
    })),
    createdAt: room.createdAt.toISOString(),
  };
}
