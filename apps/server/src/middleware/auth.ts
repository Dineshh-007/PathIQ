import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export interface JwtPayload {
  id: string;
  name: string;
  email: string;
}

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(payload: JwtPayload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret', {
    expiresIn: '7d',
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(
    token,
    process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret'
  ) as JwtPayload;
}

import { prisma } from '../config/database';

// ─── Fastify Auth Middleware ──────────────────────────────────────────────────
export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing authorization header' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    // Verify user still exists in the database
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) {
      return reply.status(401).send({ error: 'User no longer exists' });
    }
    (req as any).user = payload;
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}

// ─── Socket Auth Helper ───────────────────────────────────────────────────────
export function verifySocketToken(token: string): JwtPayload | null {
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}
