import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../middleware/auth';

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/register — tight limit: 10 attempts per 15 min per IP
  app.post('/register', {
    config: {
      rateLimit: {
        max: 100,
        timeWindow: '15 minutes',
      },
    },
  }, async (req, reply) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() });
    }
    const { name, email, password } = result.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    const payload = { id: user.id, name: user.name, email: user.email };
    return reply.status(201).send({
      user,
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    });
  });

  // POST /api/auth/login — 15 attempts per 15 min per IP
  app.post('/login', {
    config: {
      rateLimit: {
        max: 15,
        timeWindow: '15 minutes',
      },
    },
  }, async (req, reply) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() });
    }
    const { email, password } = result.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const payload = { id: user.id, name: user.name, email: user.email };
    return reply.send({
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    });
  });

  // POST /api/auth/refresh — 30 req/min (token rotation can be frequent)
  app.post('/refresh', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      },
    },
  }, async (req, reply) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      return reply.status(400).send({ error: 'Refresh token required' });
    }
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }
    const newAccess = signAccessToken({
      id: payload.id,
      name: payload.name,
      email: payload.email,
    });
    return reply.send({ accessToken: newAccess });
  });

  // GET /api/auth/me
  app.get('/me', {
    preHandler: [async (req, reply) => {
      const { authenticate } = await import('../middleware/auth');
      return authenticate(req, reply);
    }],
  }, async (req, reply) => {
    const user = (req as any).user;
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, avatarUrl: true, totalSessions: true, averageScore: true },
    });
    return reply.send({ user: dbUser });
  });
}
