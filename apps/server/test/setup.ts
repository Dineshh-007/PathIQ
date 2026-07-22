/**
 * Vitest global setup — runs before every test file.
 * Sets stub env vars so modules can load without a real .env file.
 * No real DB or Redis connection is made in unit tests.
 */
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-unit-tests';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-unit-tests';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.NODE_ENV = 'test';
