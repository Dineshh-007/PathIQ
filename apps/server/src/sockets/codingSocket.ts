import { Server as IoServer, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@peerprep/shared-types';
import { prisma } from '../config/database';

const fullRoomInclude = {
  sessions: {
    include: {
      question: true
    }
  },
  interviewer: true,
  candidate: true,
};

export function registerCodingSocket(io: IoServer) {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    // Join a coding room
    socket.on('coding:join_room', async ({ roomId }: { roomId: string }) => {
      try {
        socket.join(`coding:${roomId}`);
        
        let room = await prisma.codingRoom.findUnique({
          where: { id: roomId },
          include: fullRoomInclude
        });
        
        if (!room) {
          socket.emit('error', 'Arena room not found or no longer active');
          return;
        }

        // Assign candidate if missing and joining user is not interviewer
        const userId = getSocketUserId(socket);
        if (!room.candidateId && room.interviewerId !== userId && userId) {
          room = await prisma.codingRoom.update({
            where: { id: roomId },
            data: { candidateId: userId },
            include: fullRoomInclude
          });
        }

        socket.emit('coding:room_state', room as any);
        io.to(`coding:${roomId}`).emit('coding:room_state', room as any);
      } catch (err) {
        console.error('Error joining coding room:', err);
        socket.emit('error', 'Failed to join coding room');
      }
    });

    // State Transitions
    socket.on('coding:propose_questions', async ({ questionIds }: { questionIds: string[] }) => {
      try {
        const rooms = Array.from(socket.rooms).filter(r => r.startsWith('coding:'));
        if (!rooms.length) return;
        const roomId = rooms[0].split(':')[1];

        const roomSession = await prisma.codingRoom.findUnique({ where: { id: roomId }, include: { sessions: true } });
        if (!roomSession || !roomSession.sessions[0]) return;

        await prisma.codingSession.update({
          where: { id: roomSession.sessions[0].id },
          data: { proposedQIds: questionIds, phase: 'selecting' }
        });

        const updatedRoom = await prisma.codingRoom.findUnique({ where: { id: roomId }, include: fullRoomInclude });
        io.to(`coding:${roomId}`).emit('coding:room_state', updatedRoom as any);
      } catch (err) {
        console.error('Error proposing questions:', err);
        socket.emit('error', 'Failed to propose questions');
      }
    });

    socket.on('coding:select_question', async ({ questionId }: { questionId: string }) => {
      try {
        const rooms = Array.from(socket.rooms).filter(r => r.startsWith('coding:'));
        if (!rooms.length) return;
        const roomId = rooms[0].split(':')[1];

        const roomSession = await prisma.codingRoom.findUnique({ where: { id: roomId }, include: { sessions: true } });
        if (!roomSession || !roomSession.sessions[0]) return;

        await prisma.codingSession.update({
          where: { id: roomSession.sessions[0].id },
          data: { questionId, phase: 'coding' }
        });

        const updatedRoom = await prisma.codingRoom.findUnique({
          where: { id: roomId },
          include: fullRoomInclude
        });
        io.to(`coding:${roomId}`).emit('coding:room_state', updatedRoom as any);
      } catch (err) {
        console.error('Error selecting question:', err);
        socket.emit('error', 'Failed to select question');
      }
    });

    socket.on('coding:end_session', async () => {
      try {
        const rooms = Array.from(socket.rooms).filter(r => r.startsWith('coding:'));
        if (!rooms.length) return;
        const roomId = rooms[0].split(':')[1];

        const roomSession = await prisma.codingRoom.findUnique({ where: { id: roomId }, include: { sessions: true } });
        if (!roomSession || !roomSession.sessions[0]) return;

        await prisma.codingSession.update({
          where: { id: roomSession.sessions[0].id },
          data: { phase: 'evaluating' }
        });

        const updatedRoom = await prisma.codingRoom.findUnique({ where: { id: roomId }, include: fullRoomInclude });
        io.to(`coding:${roomId}`).emit('coding:room_state', updatedRoom as any);
      } catch (err) {
        console.error('Error ending session:', err);
        socket.emit('error', 'Failed to end session');
      }
    });

    socket.on('coding:submit_feedback', async (feedback: any) => {
      try {
        const rooms = Array.from(socket.rooms).filter(r => r.startsWith('coding:'));
        if (!rooms.length) return;
        const roomId = rooms[0].split(':')[1];

        const roomSession = await prisma.codingRoom.findUnique({ where: { id: roomId }, include: { sessions: true } });
        if (!roomSession || !roomSession.sessions[0]) return;

        await prisma.codingSession.update({
          where: { id: roomSession.sessions[0].id },
          data: { ...feedback, phase: 'finished' }
        });

        const updatedRoom = await prisma.codingRoom.findUnique({ where: { id: roomId }, include: fullRoomInclude });
        io.to(`coding:${roomId}`).emit('coding:room_state', updatedRoom as any);
      } catch (err) {
        console.error('Error submitting feedback:', err);
        socket.emit('error', 'Failed to submit feedback');
      }
    });

    // WebRTC Signaling
    socket.on('webrtc:offer', ({ targetUserId, offer }: { targetUserId: string; offer: any }) => {
      socket.to(`user:${targetUserId}`).emit('webrtc:offer', { sourceUserId: getSocketUserId(socket), offer });
    });

    socket.on('webrtc:answer', ({ targetUserId, answer }: { targetUserId: string; answer: any }) => {
      socket.to(`user:${targetUserId}`).emit('webrtc:answer', { sourceUserId: getSocketUserId(socket), answer });
    });

    socket.on('webrtc:ice_candidate', ({ targetUserId, candidate }: { targetUserId: string; candidate: any }) => {
      socket.to(`user:${targetUserId}`).emit('webrtc:ice_candidate', { sourceUserId: getSocketUserId(socket), candidate });
    });
  });
}

function getSocketUserId(socket: any): string {
  return (socket as any)._userId ?? socket.handshake.query.userId ?? '';
}
