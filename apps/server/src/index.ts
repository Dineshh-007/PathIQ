import 'dotenv/config';
import { execSync } from 'child_process';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@peerprep/shared-types';
import { authRoutes } from './routes/auth';
import { roomRoutes } from './routes/rooms';
import { aiRoutes } from './routes/ai';
import codingRoutes from './routes/codingRoutes';
import { registerRoomSocket } from './sockets/roomSocket';
import { registerInterviewSocket } from './sockets/interviewSocket';
import { registerCodingSocket } from './sockets/codingSocket';
import { prisma } from './config/database';
import { WebSocketServer } from 'ws';
// @ts-ignore
import { setupWSConnection } from 'y-websocket/bin/utils';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

async function bootstrap() {
  const app = Fastify({ logger: process.env.NODE_ENV === 'development' });

  // ─── CORS ──────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: CLIENT_URL,
    credentials: true,
  });

  // ─── Rate limiting ─────────────────────────────────────────────────────────
  // Global: 200 req / min per IP (generous — protects all routes by default)
  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: (_req, context) => ({
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)}s.`,
      statusCode: 429,
    }),
  });

  // Tighter limits on auth endpoints — overridden per-route in auth.ts
  // register: 10/15min, login: 15/15min, refresh: 30/min (see auth.ts config)

  // ─── Routes ────────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(roomRoutes, { prefix: '/api/rooms' });
  await app.register(aiRoutes, { prefix: '/api/ai' });
  await app.register(codingRoutes);

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // ─── Diagnostic DB Sync Route ──────────────────────────────────────────────
  app.get('/api/system/sync-db', async (req, reply) => {
    try {
      const output = execSync('npx prisma db push --accept-data-loss', { encoding: 'utf-8' });
      return { status: 'success', output };
    } catch (err: any) {
      reply.status(500).send({
        status: 'error',
        message: err.message,
        stdout: err.stdout?.toString(),
        stderr: err.stderr?.toString()
      });
    }
  });

  // ─── Diagnostic DB Seed Route ──────────────────────────────────────────────
  app.get('/api/system/seed-db', async (req, reply) => {
    try {
      const output = execSync('npx ts-node prisma/seed.ts', { encoding: 'utf-8' });
      return { status: 'success', output };
    } catch (err: any) {
      reply.status(500).send({
        status: 'error',
        message: err.message,
        stdout: err.stdout?.toString(),
        stderr: err.stderr?.toString()
      });
    }
  });
  // ─── Socket.io ─────────────────────────────────────────────────────────────
  const httpServer = app.server;
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Setup Yjs Native WebSocket Server for real-time CRDT syncing
  const wss = new WebSocketServer({ noServer: true });
  wss.on('connection', setupWSConnection);

  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/yjs')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  // Attach io to fastify instance for use in routes
  app.decorate('io', io);

  // Register socket namespaces
  registerRoomSocket(io);
  registerInterviewSocket(io);
  registerCodingSocket(io);

  // Add the user room logic inside io.on connection directly here or inside the socket files.
  // Actually, we can just let codingSocket.ts handle it or add a global connection listener here.
  io.on('connection', (socket) => {
    const userId = (socket as any)._userId ?? socket.handshake.query.userId;
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });

  // ─── Start ─────────────────────────────────────────────────────────────────
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`🚀 PathIQ server running on http://localhost:${PORT}`);
}

bootstrap().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
