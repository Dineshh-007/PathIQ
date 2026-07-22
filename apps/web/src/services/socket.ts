'use client';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@peerprep/shared-types';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (!socket) {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
