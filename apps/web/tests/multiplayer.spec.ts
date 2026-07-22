import { test, expect, Browser } from '@playwright/test';

test.describe('Multiplayer Peer Interview Platform End-to-End', () => {
  test('Complete session flow with 3 peers', async ({ browser }: { browser: Browser }) => {
    test.setTimeout(90000); // 90 seconds timeout for full E2E run
    
    // Create 3 isolated contexts and pages
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();

    const users = [
      { page: page1, name: 'Alice', email: `alice_${Date.now()}@test.com` },
      { page: page2, name: 'Bob', email: `bob_${Date.now()}@test.com` },
      { page: page3, name: 'Charlie', email: `charlie_${Date.now()}@test.com` }
    ];

    // 1. Register all 3 users in parallel
    await Promise.all(users.map(async (u) => {
      await u.page.goto('/register');
      await u.page.fill('input[type="text"]', u.name);
      await u.page.fill('input[type="email"]', u.email);
      await u.page.fill('input[id="reg-password"]', 'password123');
      await u.page.fill('input[id="confirm-password"]', 'password123');
      await Promise.all([
        u.page.waitForURL('/dashboard'),
        u.page.click('button[type="submit"]')
      ]);
    }));

    // 2. Alice (Host) creates a room
    await page1.click('button#create-room-btn');
    // Wait for the room text to appear
    await page1.waitForSelector('text=Waiting Lobby');
    
    // Get room code
    const roomCodeElement = await page1.locator('div', { hasText: /^[A-Z0-9]{6}$/ }).first();
    const roomCode = await roomCodeElement.innerText();
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

    // 3. Bob and Charlie join the room
    for (const u of [users[1], users[2]]) {
      await u.page.fill('input#room-code-input', roomCode);
      await Promise.all([
        u.page.waitForURL(`/room/${roomCode}`),
        u.page.click('button#join-room-btn')
      ]);
    }

    // Wait for everyone to render in lobby
    await page1.waitForSelector(`text=${users[1].name}`);
    await page1.waitForSelector(`text=${users[2].name}`);

    // 4. Everyone hits Ready
    await page1.click('button#ready-btn');
    await page2.click('button#ready-btn');
    await page3.click('button#ready-btn');

    // Wait for the session starting text
    await expect(page1.locator('text=Session starting').first()).toBeVisible();

    // The session will automatically drop them into Role Selection phase.
    await page1.waitForSelector('text=Select Your Interview Role');
    await page2.waitForSelector('text=is selecting their role');
    await page3.waitForSelector('text=is selecting their role');

    // 5. Host (Alice) leaves the room to test that functionality
    // Wait, testing leave room here will ruin the flow. 
    // We already verified the lobby, let's test if the host can leave from dashboard.
    // However, if we want to test everything, we can just let it continue to voting.
    
    // Choose role for Alice (instantly transitions state)
    await page1.click('text=Software Engineer');
    
    // Wait for the voting phase to start!
    await page1.waitForSelector('text=Vote for a Question');
    await page2.waitForSelector('text=Vote for a Question');
    await page3.waitForSelector('text=Vote for a Question');

    // Bob and Charlie vote for first question
    await page2.waitForSelector('button#vote-q-0', { timeout: 15000 });
    await page2.locator('button#vote-q-0').click();
    await page3.waitForSelector('button#vote-q-0', { timeout: 15000 });
    await page3.locator('button#vote-q-0').click();

    // Check we move to Answer phase
    await page1.waitForSelector('text=Answer Time');
    await page2.waitForSelector('text=Answer Time');

    // Alice types an answer text and hits done
    await page1.fill('textarea#answer-input', 'This is Alice’s test answer for the question!');
    await page1.click('button:has-text("Submit Final Answer")');

    // Check we arrive at Evaluation phase
    await page1.waitForSelector('text=Private Evaluation');
    await page2.waitForSelector('text=Private Evaluation');

    // Bob and Charlie verify Alice's written answer rendered for them
    await expect(page2.locator('text=This is Alice’s test answer for the question!')).toBeVisible();
    await expect(page3.locator('text=This is Alice’s test answer for the question!')).toBeVisible();

    // Reconnection Test bounds: Charlie refreshes page during Eval Phase
    await page3.reload();
    await page3.waitForSelector('text=Private Evaluation', { timeout: 10000 });
    // Verify Charlie STILL sees Alice's text due to our room socket fallback!
    await expect(page3.locator('text=This is Alice’s test answer for the question!')).toBeVisible();

    // Bob and Charlie submit evaluations
    await page2.waitForSelector('button#submit-eval-btn', { timeout: 15000 });
    await page2.click('button#submit-eval-btn');
    await page3.waitForSelector('button#submit-eval-btn', { timeout: 15000 });
    await page3.click('button#submit-eval-btn');

    // Wait for reveal
    await page1.waitForSelector('text=Scores Revealed!');
    await page2.waitForSelector('text=Scores Revealed!');

    // Advance to next rotation 
    // Wait for "is selecting their role" for user 2!
    await page1.waitForSelector('text=is selecting their role', { timeout: 15000 });
    await page2.waitForSelector('text=Select Your Interview Role');

    // We successfully completed a real E2E multiplayer lifecycle transition!
    
    await context1.close();
    await context2.close();
    await context3.close();
  });
});
