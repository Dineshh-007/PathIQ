import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma before importing any module that uses it ─────────────────────
// We must declare the mock factory before any import that triggers database.ts.
vi.mock('../src/config/database', () => ({
  prisma: {
    interviewSession: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock Redis so BullMQ/ioredis don't try to connect
vi.mock('../src/config/redis', () => ({
  redis: { on: vi.fn() },
  redisKeys: {},
}));

import { buildSessionState, startInterviewTurn } from '../src/sockets/sessionHelpers';
import { prisma } from '../src/config/database';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_SESSION = {
  id: 'sess-001',
  roomId: 'room-001',
  intervieweeId: 'user-001',
  role: 'software_engineer',
  roundNumber: 1,
  currentQuestionNumber: 1,
  phase: 'voting',
  timerEndsAt: new Date('2030-01-01T12:05:00.000Z'),
};

const MOCK_SESSION_NO_TIMER = {
  ...MOCK_SESSION,
  id: 'sess-002',
  timerEndsAt: null,
};

function makeMockIo() {
  const emitFn = vi.fn();
  return {
    to: vi.fn().mockReturnValue({ emit: emitFn }),
    _emitFn: emitFn,
  };
}

// ─── buildSessionState ────────────────────────────────────────────────────────

describe('buildSessionState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a correctly shaped session state object', async () => {
    vi.mocked(prisma.interviewSession.findUnique).mockResolvedValue(MOCK_SESSION as any);

    const candidateQuestions = [
      { id: 'q-1', text: 'What is a closure?', role: 'software_engineer', difficulty: 'medium' },
      { id: 'q-2', text: 'Explain async/await.', role: 'software_engineer', difficulty: 'easy' },
    ];
    const votes = { 'user-002': 'q-1', 'user-003': 'q-2' };
    const selectedQuestion = null;

    const state = await buildSessionState('sess-001', candidateQuestions, votes, selectedQuestion);

    expect(state.id).toBe('sess-001');
    expect(state.roomId).toBe('room-001');
    expect(state.intervieweeId).toBe('user-001');
    expect(state.role).toBe('software_engineer');
    expect(state.roundNumber).toBe(1);
    expect(state.questionNumber).toBe(1);
    expect(state.phase).toBe('voting');
    expect(state.candidateQuestions).toHaveLength(2);
    expect(state.candidateQuestions[0]).toMatchObject({ id: 'q-1', text: 'What is a closure?' });
    expect(state.votes).toEqual(votes);
    expect(state.selectedQuestion).toBeNull();
  });

  it('sets timerEndsAt to ISO string when session has a DB timer', async () => {
    vi.mocked(prisma.interviewSession.findUnique).mockResolvedValue(MOCK_SESSION as any);

    const state = await buildSessionState('sess-001', [], {}, null);

    expect(state.timerEndsAt).toBe('2030-01-01T12:05:00.000Z');
  });

  it('sets timerEndsAt to null when session has no timer', async () => {
    vi.mocked(prisma.interviewSession.findUnique).mockResolvedValue(MOCK_SESSION_NO_TIMER as any);

    const state = await buildSessionState('sess-002', [], {}, null);

    expect(state.timerEndsAt).toBeNull();
  });

  it('throws when the session is not found in DB', async () => {
    vi.mocked(prisma.interviewSession.findUnique).mockResolvedValue(null);

    await expect(buildSessionState('nonexistent', [], {}, null)).rejects.toThrow('Session not found');
  });

  it('maps candidateQuestions to the correct minimal shape', async () => {
    vi.mocked(prisma.interviewSession.findUnique).mockResolvedValue(MOCK_SESSION as any);

    const rawQuestions = [
      { id: 'q-x', text: 'Q text', role: 'ai_engineer', difficulty: 'hard', usageCount: 42, createdAt: new Date() },
    ];
    const state = await buildSessionState('sess-001', rawQuestions, {}, null);

    // Only id/text/role/difficulty should be in the mapped output
    expect(state.candidateQuestions[0]).toEqual({
      id: 'q-x',
      text: 'Q text',
      role: 'ai_engineer',
      difficulty: 'hard',
    });
    expect(state.candidateQuestions[0]).not.toHaveProperty('usageCount');
    expect(state.candidateQuestions[0]).not.toHaveProperty('createdAt');
  });

  it('passes selectedQuestion through unmodified', async () => {
    vi.mocked(prisma.interviewSession.findUnique).mockResolvedValue(MOCK_SESSION as any);

    const selected = { id: 'q-1', text: 'Explain polymorphism.', role: 'software_engineer', difficulty: 'medium', answerText: 'My answer here' };
    const state = await buildSessionState('sess-001', [], {}, selected);

    expect(state.selectedQuestion).toStrictEqual(selected);
  });
});

// ─── startInterviewTurn ───────────────────────────────────────────────────────

describe('startInterviewTurn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const MOCK_ROOM = { id: 'room-001', roomCode: 'ABC123' };

  const MOCK_PARTICIPANTS = [
    { userId: 'user-001', user: { name: 'Alice' } },
    { userId: 'user-002', user: { name: 'Bob' } },
    { userId: 'user-003', user: { name: 'Charlie' } },
  ];

  it('creates an InterviewSession for the correct participant (roundNumber - 1 index)', async () => {
    const createdSession = { ...MOCK_SESSION, id: 'new-sess-1' };
    vi.mocked(prisma.interviewSession.create).mockResolvedValue(createdSession as any);
    vi.mocked(prisma.interviewSession.findUnique).mockResolvedValue(createdSession as any);

    const io = makeMockIo();
    await startInterviewTurn(io as any, MOCK_ROOM, 1, MOCK_PARTICIPANTS);

    expect(prisma.interviewSession.create).toHaveBeenCalledOnce();
    const createCall = vi.mocked(prisma.interviewSession.create).mock.calls[0][0];
    expect(createCall.data.intervieweeId).toBe('user-001'); // index 0 for round 1
    expect(createCall.data.roundNumber).toBe(1);
    expect(createCall.data.phase).toBe('role_selection');
    expect(createCall.data.currentQuestionNumber).toBe(1);
  });

  it('emits interview:session_start with the correct intervieweeName', async () => {
    const createdSession = { ...MOCK_SESSION, id: 'new-sess-2', intervieweeId: 'user-002' };
    vi.mocked(prisma.interviewSession.create).mockResolvedValue(createdSession as any);
    vi.mocked(prisma.interviewSession.findUnique).mockResolvedValue(createdSession as any);

    const io = makeMockIo();
    await startInterviewTurn(io as any, MOCK_ROOM, 2, MOCK_PARTICIPANTS);

    // io.to(roomCode).emit(...)
    expect(io.to).toHaveBeenCalledWith('ABC123');
    const emitArgs = io._emitFn.mock.calls[0];
    expect(emitArgs[0]).toBe('interview:session_start');
    expect(emitArgs[1].intervieweeName).toBe('Bob'); // participant at index 1
    expect(emitArgs[1].roundNumber).toBe(2);
  });

  it('returns early without DB calls when participant index is out of bounds', async () => {
    const io = makeMockIo();
    // roundNumber 10 → participants[9] is undefined
    await startInterviewTurn(io as any, MOCK_ROOM, 10, MOCK_PARTICIPANTS);

    expect(prisma.interviewSession.create).not.toHaveBeenCalled();
    expect(io.to).not.toHaveBeenCalled();
  });

  it('falls back to "Participant" when user.name is undefined', async () => {
    const participantsNoName = [
      { userId: 'user-anon', user: undefined }, // no user object
    ];
    const createdSession = { ...MOCK_SESSION, id: 'new-sess-3', intervieweeId: 'user-anon' };
    vi.mocked(prisma.interviewSession.create).mockResolvedValue(createdSession as any);
    vi.mocked(prisma.interviewSession.findUnique).mockResolvedValue(createdSession as any);

    const io = makeMockIo();
    await startInterviewTurn(io as any, MOCK_ROOM, 1, participantsNoName);

    const emitArgs = io._emitFn.mock.calls[0];
    expect(emitArgs[1].intervieweeName).toBe('Participant');
  });
});
