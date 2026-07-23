import { Server as IoServer, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@peerprep/shared-types';
import { prisma } from '../config/database';

export function registerCodingSocket(io: IoServer) {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    // Join a coding room
  socket.on('coding:join_room', async ({ roomId }: { roomId: string }) => {
    socket.join(`coding:${roomId}`);
    
    // Optionally fetch room state and broadcast
    let room = await prisma.codingRoom.findUnique({
      where: { id: roomId },
      include: { sessions: true }
    });
    
    // Assign candidate if missing and joining user is not interviewer
    const userId = getSocketUserId(socket);
    if (room && !room.candidateId && room.interviewerId !== userId) {
      room = await prisma.codingRoom.update({
        where: { id: roomId },
        data: { candidateId: userId },
        include: { sessions: true }
      });
    }

    if (room) {
      socket.emit('coding:room_state', room as any);
    }
  });

  // State Transitions
  socket.on('coding:propose_questions', async ({ questionIds }: { questionIds: string[] }) => {
    // We need to find the room this socket is in
    const rooms = Array.from(socket.rooms).filter(r => r.startsWith('coding:'));
    if (!rooms.length) return;
    const roomId = rooms[0].split(':')[1];

    let room = await prisma.codingRoom.findUnique({ where: { id: roomId }, include: { sessions: true } });
    if (!room || !room.sessions[0]) return;

    await prisma.codingSession.update({
      where: { id: room.sessions[0].id },
      data: { proposedQIds: questionIds, phase: 'selecting' }
    });

    room = await prisma.codingRoom.findUnique({ where: { id: roomId }, include: { sessions: true } });
    io.to(`coding:${roomId}`).emit('coding:room_state', room as any);
  });

  socket.on('coding:select_question', async ({ questionId }: { questionId: string }) => {
    const rooms = Array.from(socket.rooms).filter(r => r.startsWith('coding:'));
    if (!rooms.length) return;
    const roomId = rooms[0].split(':')[1];

    let room = await prisma.codingRoom.findUnique({ where: { id: roomId }, include: { sessions: true } });
    if (!room || !room.sessions[0]) return;

    await prisma.codingSession.update({
      where: { id: room.sessions[0].id },
      data: { questionId, phase: 'coding' }
    });

    // Populate question to send back
    room = await prisma.codingRoom.findUnique({
      where: { id: roomId },
      include: { 
        sessions: { include: { question: true } },
        interviewer: true,
        candidate: true
      }
    });
    io.to(`coding:${roomId}`).emit('coding:room_state', room as any);
  });

  socket.on('coding:end_session', async () => {
    const rooms = Array.from(socket.rooms).filter(r => r.startsWith('coding:'));
    if (!rooms.length) return;
    const roomId = rooms[0].split(':')[1];

    let room = await prisma.codingRoom.findUnique({ where: { id: roomId }, include: { sessions: true } });
    if (!room || !room.sessions[0]) return;

    await prisma.codingSession.update({
      where: { id: room.sessions[0].id },
      data: { phase: 'evaluating' }
    });

    room = await prisma.codingRoom.findUnique({ where: { id: roomId }, include: { sessions: true } });
    io.to(`coding:${roomId}`).emit('coding:room_state', room as any);
  });

  socket.on('coding:submit_feedback', async (feedback: any) => {
    const rooms = Array.from(socket.rooms).filter(r => r.startsWith('coding:'));
    if (!rooms.length) return;
    const roomId = rooms[0].split(':')[1];

    let room = await prisma.codingRoom.findUnique({ where: { id: roomId }, include: { sessions: true } });
    if (!room || !room.sessions[0]) return;

    await prisma.codingSession.update({
      where: { id: room.sessions[0].id },
      data: { ...feedback, phase: 'finished' }
    });

    room = await prisma.codingRoom.findUnique({ where: { id: roomId }, include: { sessions: true } });
    io.to(`coding:${roomId}`).emit('coding:room_state', room as any);
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
