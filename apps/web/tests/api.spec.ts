import { test, expect } from '@playwright/test';

test.describe('Backend API Edge Cases', () => {
  const baseURL = 'http://localhost:3001/api';

  test('Registration fails for duplicate email', async ({ request }) => {
    const randomEmail = `duplicate_${Date.now()}@test.com`;

    // 1st request should succeed
    const res1 = await request.post(`${baseURL}/auth/register`, {
      data: { name: 'Duplicate First', email: randomEmail, password: 'password123' },
    });
    expect(res1.status()).toBe(201);

    // 2nd request should fail
    const res2 = await request.post(`${baseURL}/auth/register`, {
      data: { name: 'Duplicate Second', email: randomEmail, password: 'password123' },
    });
    expect(res2.status()).toBe(409);
    const body = await res2.json();
    expect(body.error).toBe('Email already in use');
  });

  test('Getting a non-existent room returns 404', async ({ request }) => {
    // Need an auth token first
    const resAuth = await request.post(`${baseURL}/auth/register`, {
      data: { name: 'Room Tester', email: `room_${Date.now()}@test.com`, password: 'password123' },
    });
    const authData = await resAuth.json();
    const token = authData.accessToken;

    const resRoom = await request.get(`${baseURL}/rooms/INVALIDCODE123`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    expect(resRoom.status()).toBe(404);
  });
  
  test('Creating room without body payload falls back to defaults', async ({ request }) => {
    const resAuth = await request.post(`${baseURL}/auth/register`, {
      data: { name: 'Host Tester', email: `host_${Date.now()}@test.com`, password: 'password123' },
    });
    const authData = await resAuth.json();
    const token = authData.accessToken;

    const resCreate = await request.post(`${baseURL}/rooms/create`, {
      headers: { Authorization: `Bearer ${token}` },
      // Intentional empty body to test fallback bug recently fixed!
      data: {} 
    });

    expect(resCreate.status()).toBe(201);
    const data = await resCreate.json();
    expect(data.room.maxParticipants).toBe(5); // Default
    expect(data.room.roomCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  // ── New tests ─────────────────────────────────────────────────────────────

  test('Token refresh returns a new access token', async ({ request }) => {
    const resAuth = await request.post(`${baseURL}/auth/register`, {
      data: { name: 'Refresh Tester', email: `refresh_${Date.now()}@test.com`, password: 'password123' },
    });
    const { refreshToken, accessToken: oldToken } = await resAuth.json();

    const resRefresh = await request.post(`${baseURL}/auth/refresh`, {
      data: { refreshToken },
    });
    expect(resRefresh.status()).toBe(200);

    const { accessToken: newToken } = await resRefresh.json();
    expect(typeof newToken).toBe('string');
    // New token is a valid JWT (3 segments)
    expect(newToken.split('.')).toHaveLength(3);
    // It should be different from the original (different iat)
    expect(newToken).not.toBe(oldToken);
  });

  test('Accessing a protected route without Bearer token returns 401', async ({ request }) => {
    const res = await request.get(`${baseURL}/rooms/ANYCODE`);
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/missing|unauthorized|authorization/i);
  });

  test('Creating a room with custom timing params persists the values', async ({ request }) => {
    const resAuth = await request.post(`${baseURL}/auth/register`, {
      data: { name: 'Custom Room User', email: `custom_${Date.now()}@test.com`, password: 'password123' },
    });
    const { accessToken } = await resAuth.json();

    const resCreate = await request.post(`${baseURL}/rooms/create`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        maxParticipants: 3,
        answerTimeSecs: 120,
        votingTimeSecs: 45,
        questionsPerTurn: 1,
      },
    });
    expect(resCreate.status()).toBe(201);

    const { room } = await resCreate.json();
    expect(room.maxParticipants).toBe(3);
    expect(room.answerTimeSecs).toBe(120);
    expect(room.votingTimeSecs).toBe(45);
    expect(room.questionsPerTurn).toBe(1);
  });

  test('Token refresh fails with invalid refresh token', async ({ request }) => {
    const res = await request.post(`${baseURL}/auth/refresh`, {
      data: { refreshToken: 'not.a.valid.token' },
    });
    expect(res.status()).toBe(401);
  });

  test('Token refresh fails when refresh token is missing', async ({ request }) => {
    const res = await request.post(`${baseURL}/auth/refresh`, {
      data: {},
    });
    expect(res.status()).toBe(400);
  });
});

