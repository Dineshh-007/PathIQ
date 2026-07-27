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
  // ─── Sync database schema on startup ────────────────────────────────────────
  console.log('📦 Syncing database schema...');
  try {
    const output = execSync('npx prisma db push --accept-data-loss --skip-generate', {
      encoding: 'utf-8',
      timeout: 30000,
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
    console.log('✅ Database schema synced');
  } catch (err: any) {
    console.error('⚠️ prisma db push failed:', err.stderr || err.message);
    // Don't crash — the tables may already exist
  }

  // ─── Seed coding questions if missing ───────────────────────────────────────
  try {
    const count = await prisma.codingQuestion.count();
    if (count === 0) {
      console.log('🌱 Seeding coding questions...');
      const questions = [
        { title: 'Two Sum', description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.', category: 'Arrays', difficulty: 'medium', testCases: [{ input: '[2,7,11,15]\n9', output: '[0,1]' }, { input: '[3,2,4]\n6', output: '[1,2]' }] },
        { title: 'Valid Parentheses', description: 'Given a string s containing just the characters (, ), {, }, [ and ], determine if the input string is valid.\n\n1. Open brackets must be closed by the same type.\n2. Open brackets must be closed in the correct order.', category: 'Strings', difficulty: 'medium', testCases: [{ input: '"()"', output: 'true' }, { input: '"(]"', output: 'false' }] },
        { title: 'Merge Intervals', description: 'Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals and return non-overlapping intervals that cover all intervals.', category: 'Arrays', difficulty: 'medium', testCases: [{ input: '[[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]' }] },
        { title: 'Longest Substring Without Repeating Characters', description: 'Given a string s, find the length of the longest substring without repeating characters.', category: 'Strings', difficulty: 'medium', testCases: [{ input: '"abcabcbb"', output: '3' }, { input: '"bbbbb"', output: '1' }] },
        { title: 'LRU Cache', description: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.\n\nImplement LRUCache with get(key) and put(key, value) in O(1) time.', category: 'System Design', difficulty: 'hard', testCases: [] },
        { title: 'Reverse Linked List', description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.', category: 'Linked Lists', difficulty: 'medium', testCases: [{ input: '[1,2,3,4,5]', output: '[5,4,3,2,1]' }] },
        { title: 'Binary Tree Level Order Traversal', description: 'Given the root of a binary tree, return the level order traversal of its nodes values (left to right, level by level).', category: 'Trees', difficulty: 'medium', testCases: [{ input: '[3,9,20,null,null,15,7]', output: '[[3],[9,20],[15,7]]' }] },
        { title: 'Coin Change', description: 'Given an integer array coins and an integer amount, return the fewest coins needed to make up that amount. Return -1 if impossible.', category: 'Dynamic Programming', difficulty: 'hard', testCases: [{ input: '[1,5,11]\n15', output: '3' }] },
        { title: 'Product of Array Except Self', description: 'Given an integer array nums, return an array where answer[i] equals the product of all elements except nums[i]. Must run in O(n) without division.', category: 'Arrays', difficulty: 'medium', testCases: [{ input: '[1,2,3,4]', output: '[24,12,8,6]' }] },
        { title: 'Number of Islands', description: 'Given an m x n 2D grid of "1"s (land) and "0"s (water), return the number of islands. An island is formed by connecting adjacent lands horizontally or vertically.', category: 'Graphs', difficulty: 'hard', testCases: [{ input: '[["1","1","0"],["1","0","0"],["0","0","1"]]', output: '2' }] },
      ];
      for (const q of questions) {
        await prisma.codingQuestion.create({ data: { title: q.title, description: q.description, category: q.category, difficulty: q.difficulty, testCases: q.testCases as any } });
      }
      console.log(`✅ Seeded ${questions.length} coding questions`);
    } else {
      console.log(`✅ Coding questions already exist (${count})`);
    }
  } catch (err: any) {
    console.error('⚠️ Seed check failed (table may not exist yet):', err.message);
  }

  const app = Fastify({ 
    logger: process.env.NODE_ENV === 'development',
    trustProxy: true,
  });

  // ─── CORS ──────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: true,
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
      origin: (origin, callback) => callback(null, true),
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true,
    },
    transports: ['polling', 'websocket'],
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
