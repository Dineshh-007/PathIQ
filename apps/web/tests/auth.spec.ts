import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('User can register with valid details', async ({ page }) => {
    const randomStr = Math.random().toString(36).substring(7);
    const testEmail = `register_${randomStr}@example.com`;
    await page.goto('/register');
    await page.fill('input[type="text"]', 'Test User');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[id="reg-password"]', 'password123');
    await page.fill('input[id="confirm-password"]', 'password123');
    
    await Promise.all([
      page.waitForURL('/dashboard'),
      page.click('button[type="submit"]')
    ]);

    await expect(page.locator('h1')).toContainText('Ready to practice');
    await page.click('button:has-text("Sign Out")');
  });

  test('User can login with correct credentials', async ({ page, request }) => {
    const randomStr = Math.random().toString(36).substring(7);
    const testEmail = `login_${randomStr}@example.com`;
    
    // Seed user directly for login test
    await request.post('http://localhost:3001/api/auth/register', {
      data: { name: 'Login Tester', email: testEmail, password: 'password123' },
    });
    await page.goto('/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'password123');
    
    await Promise.all([
      page.waitForURL('/dashboard'),
      page.click('button[type="submit"]')
    ]);

    await expect(page.locator('h1')).toContainText('Ready to practice');
  });

  test('User receives error with incorrect credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    const errorMsg = page.locator('text=Invalid credentials');
    await expect(errorMsg).toBeVisible();
  });

  // ── Validation error tests ────────────────────────────────────────────────

  test('Registration fails when password is shorter than 8 characters', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[type="text"]', 'Short Pass');
    await page.fill('input[type="email"]', `short_${Date.now()}@test.com`);
    await page.fill('input[id="reg-password"]', 'abc');
    await page.fill('input[id="confirm-password"]', 'abc');
    await page.click('button[type="submit"]');

    // Should stay on register page — not navigate away
    await expect(page).toHaveURL(/\/register/);
  });

  test('Registration fails when passwords do not match', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[type="text"]', 'Mismatch User');
    await page.fill('input[type="email"]', `mismatch_${Date.now()}@test.com`);
    await page.fill('input[id="reg-password"]', 'password123');
    await page.fill('input[id="confirm-password"]', 'different456');
    await page.click('button[type="submit"]');

    // Should stay on register page and show an error
    await expect(page).toHaveURL(/\/register/);
    const errorEl = page.locator('text=/password.*match/i, text=/match.*password/i').first();
    await expect(errorEl).toBeVisible();
  });

  test('Login form rejects submission with empty fields', async ({ page }) => {
    await page.goto('/login');
    // Do not fill in any fields
    await page.click('button[type="submit"]');

    // Should remain on login page
    await expect(page).toHaveURL(/\/login/);
  });
});

