import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  verifySocketToken,
} from '../src/middleware/auth';

// JWT_SECRET and JWT_REFRESH_SECRET are set by test/setup.ts
// All functions are pure (no DB, no side effects).

const SAMPLE_PAYLOAD = {
  id: 'user-uuid-1234',
  name: 'Test User',
  email: 'test@example.com',
};

// ─── signAccessToken / verifyAccessToken ──────────────────────────────────────

describe('signAccessToken + verifyAccessToken', () => {
  it('round-trips a valid payload', () => {
    const token = signAccessToken(SAMPLE_PAYLOAD);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // three JWT segments

    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe(SAMPLE_PAYLOAD.id);
    expect(decoded.name).toBe(SAMPLE_PAYLOAD.name);
    expect(decoded.email).toBe(SAMPLE_PAYLOAD.email);
  });

  it('includes standard JWT fields (iat, exp)', () => {
    const token = signAccessToken(SAMPLE_PAYLOAD);
    const decoded = verifyAccessToken(token);
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
    // exp should be ~15 minutes from now
    const nowSecs = Math.floor(Date.now() / 1000);
    expect((decoded as any).exp).toBeGreaterThan(nowSecs);
    expect((decoded as any).exp).toBeLessThanOrEqual(nowSecs + 15 * 60 + 5);
  });

  it('throws when the token is tampered', () => {
    const token = signAccessToken(SAMPLE_PAYLOAD);
    // Mutate the payload segment (second part)
    const parts = token.split('.');
    parts[1] = Buffer.from(JSON.stringify({ id: 'hacker', name: 'X', email: 'x@x.com', exp: 9999999999 })).toString('base64url');
    const tampered = parts.join('.');
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('throws when the token uses the wrong secret', () => {
    // Sign with a different secret manually
    const jwt = require('jsonwebtoken');
    const badToken = jwt.sign(SAMPLE_PAYLOAD, 'wrong-secret', { expiresIn: '15m' });
    expect(() => verifyAccessToken(badToken)).toThrow();
  });

  it('throws on a completely invalid string', () => {
    expect(() => verifyAccessToken('not.a.jwt')).toThrow();
    expect(() => verifyAccessToken('')).toThrow();
  });
});

// ─── signRefreshToken / verifyRefreshToken ────────────────────────────────────

describe('signRefreshToken + verifyRefreshToken', () => {
  it('round-trips a valid payload', () => {
    const token = signRefreshToken(SAMPLE_PAYLOAD);
    const decoded = verifyRefreshToken(token);
    expect(decoded.id).toBe(SAMPLE_PAYLOAD.id);
    expect(decoded.email).toBe(SAMPLE_PAYLOAD.email);
  });

  it('access token is NOT accepted by verifyRefreshToken', () => {
    // They use different secrets
    const accessToken = signAccessToken(SAMPLE_PAYLOAD);
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });

  it('refresh token is NOT accepted by verifyAccessToken', () => {
    const refreshToken = signRefreshToken(SAMPLE_PAYLOAD);
    expect(() => verifyAccessToken(refreshToken)).toThrow();
  });
});

// ─── verifySocketToken ────────────────────────────────────────────────────────

describe('verifySocketToken', () => {
  it('returns the payload for a valid access token', () => {
    const token = signAccessToken(SAMPLE_PAYLOAD);
    const result = verifySocketToken(token);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(SAMPLE_PAYLOAD.id);
  });

  it('returns null for an invalid token (does not throw)', () => {
    expect(verifySocketToken('garbage.token.value')).toBeNull();
    expect(verifySocketToken('')).toBeNull();
  });

  it('returns null for a tampered token (does not throw)', () => {
    const token = signAccessToken(SAMPLE_PAYLOAD);
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(verifySocketToken(tampered)).toBeNull();
  });

  it('returns null for a refresh token (wrong secret)', () => {
    const refreshToken = signRefreshToken(SAMPLE_PAYLOAD);
    expect(verifySocketToken(refreshToken)).toBeNull();
  });
});
