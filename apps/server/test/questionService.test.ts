import { describe, it, expect } from 'vitest';
import { selectWinningQuestion } from '../src/services/questionService';

// ─── selectWinningQuestion ────────────────────────────────────────────────────
// Pure function — no DB, no mocks required.
// Signature: selectWinningQuestion(votes: Record<string,string>, candidateIds: string[]) => string

const CANDIDATES = ['q-alpha', 'q-beta', 'q-gamma', 'q-delta', 'q-epsilon'];

describe('selectWinningQuestion', () => {
  it('returns the unanimous choice when all voters pick the same question', () => {
    const votes = {
      user1: 'q-beta',
      user2: 'q-beta',
      user3: 'q-beta',
      user4: 'q-beta',
    };
    expect(selectWinningQuestion(votes, CANDIDATES)).toBe('q-beta');
  });

  it('returns the majority winner when one question has the most votes', () => {
    const votes = {
      user1: 'q-alpha',
      user2: 'q-gamma',
      user3: 'q-gamma',
      user4: 'q-delta',
    };
    // q-gamma has 2 votes, alpha and delta have 1 each
    expect(selectWinningQuestion(votes, CANDIDATES)).toBe('q-gamma');
  });

  it('breaks exact ties using FIFO order (first candidate in array wins)', () => {
    // q-alpha and q-gamma are tied at 2 votes each.
    // q-alpha appears before q-gamma in CANDIDATES → should win.
    const votes = {
      user1: 'q-alpha',
      user2: 'q-alpha',
      user3: 'q-gamma',
      user4: 'q-gamma',
    };
    expect(selectWinningQuestion(votes, CANDIDATES)).toBe('q-alpha');
  });

  it('returns first candidate by FIFO when no votes have been cast', () => {
    expect(selectWinningQuestion({}, CANDIDATES)).toBe('q-alpha');
  });

  it('returns the only candidate when there is exactly one option', () => {
    const votes = { user1: 'q-only', user2: 'q-only' };
    expect(selectWinningQuestion(votes, ['q-only'])).toBe('q-only');
  });

  it('ignores votes for ids not present in candidateIds', () => {
    // user1 votes for a phantom id; only user2 and user3 vote for valid ones.
    const votes = {
      user1: 'q-phantom-not-in-list',
      user2: 'q-delta',
      user3: 'q-delta',
    };
    expect(selectWinningQuestion(votes, CANDIDATES)).toBe('q-delta');
  });

  it('handles a single voter correctly', () => {
    const votes = { user1: 'q-epsilon' };
    expect(selectWinningQuestion(votes, CANDIDATES)).toBe('q-epsilon');
  });

  it('preserves determinism — same input always returns same output', () => {
    const votes = { user1: 'q-beta', user2: 'q-gamma', user3: 'q-beta' };
    const result1 = selectWinningQuestion(votes, CANDIDATES);
    const result2 = selectWinningQuestion(votes, CANDIDATES);
    expect(result1).toBe(result2);
    expect(result1).toBe('q-beta');
  });
});
