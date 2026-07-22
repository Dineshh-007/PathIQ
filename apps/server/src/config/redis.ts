import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err));

// ─── Room State Keys ─────────────────────────────────────────────────────────
export const redisKeys = {
  roomState: (roomCode: string) => `room:${roomCode}:state`,
  roomParticipants: (roomCode: string) => `room:${roomCode}:participants`,
  sessionPhase: (sessionId: string) => `session:${sessionId}:phase`,
  sessionVotes: (sessionId: string, qNum: number) => `session:${sessionId}:q${qNum}:votes`,
  sessionEvals: (sessionId: string, sqId: string) => `session:${sessionId}:sq:${sqId}:evals`,
  sessionEvalCount: (sqId: string) => `sq:${sqId}:eval_count`,
  shownQuestions: (roomId: string, userId: string) => `room:${roomId}:user:${userId}:shown_qs`,
  timerJob: (sessionId: string) => `timer:${sessionId}`,
};
