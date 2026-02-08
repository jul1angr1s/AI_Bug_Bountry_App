import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:3000';

/**
 * E2E Verification Tests for All Workstreams
 *
 * Workstream 0: Shared Foundation (explorer URLs, description maps, AgentType fix)
 * Workstream 1: Enhanced Agents Section (agent cards, registry stats, navigation)
 * Workstream 2: X.402 Live Payments (payment gate, 402 handler, modal, page)
 * Workstream 3: ERC-8004 Verification Indicators (registry, reputation, feedback, escrow)
 * Workstream 4: Demo Seed Script (verified via seeded data)
 */

// =============================================
// Backend API Tests (no auth needed for GET endpoints)
// =============================================

test.describe('Workstream 0: Backend API Endpoints', () => {
  test('GET /health returns ok', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/v1/health`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.services.database).toBe('ok');
    expect(data.services.redis).toBe('ok');
  });

  test('GET /agent-identities returns seeded agents with serialized BigInts', async ({
    request,
  }) => {
    const response = await request.get(`${API_BASE_URL}/api/v1/agent-identities`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThanOrEqual(2);

    // Find the seeded researcher (has reputation score > 0 and agentNftId)
    const researcher = data.data.find(
      (a: any) => a.agentType === 'RESEARCHER' && a.reputation?.reputationScore > 0
    );
    expect(researcher).toBeDefined();
    // BigInt serialization: agentNftId should be string (not BigInt error)
    expect(typeof researcher.agentNftId).toBe('string');
    expect(researcher.reputation.reputationScore).toBeGreaterThan(0);

    // Date serialization works
    expect(typeof researcher.registeredAt).toBe('string');
    expect(researcher.registeredAt).toContain('T'); // ISO format
  });

  test('GET /agent-identities/x402-payments returns seeded payments', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/v1/agent-identities/x402-payments`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThanOrEqual(3);

    // Verify amount is serialized as string
    const completed = data.data.find((p: any) => p.status === 'COMPLETED');
    expect(completed).toBeDefined();
    expect(typeof completed.amount).toBe('string');
    expect(completed.txHash).toBeTruthy();

    // Verify different statuses exist
    const pending = data.data.find((p: any) => p.status === 'PENDING');
    expect(pending).toBeDefined();
    expect(pending.txHash).toBeNull();
  });

  test('GET /agent-identities/:id returns agent with serialized fields', async ({ request }) => {
    const listResponse = await request.get(`${API_BASE_URL}/api/v1/agent-identities`);
    const listData = await listResponse.json();
    // Use the seeded agent (has agentNftId)
    const seeded = listData.data.find((a: any) => a.agentNftId !== null);
    expect(seeded).toBeDefined();

    const response = await request.get(`${API_BASE_URL}/api/v1/agent-identities/${seeded.id}`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.walletAddress).toBeTruthy();
    expect(typeof data.data.agentNftId).toBe('string');
  });

  test('GET /agent-identities/:id/reputation returns reputation data', async ({ request }) => {
    const listResponse = await request.get(`${API_BASE_URL}/api/v1/agent-identities`);
    const listData = await listResponse.json();
    const researcher = listData.data.find(
      (a: any) => a.agentType === 'RESEARCHER' && a.reputation?.reputationScore > 0
    );

    const response = await request.get(
      `${API_BASE_URL}/api/v1/agent-identities/${researcher.id}/reputation`
    );
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.reputationScore).toBe(85);
    expect(data.data.confirmedCount).toBe(12);
    expect(data.data.totalSubmissions).toBe(15);
    // Date should be ISO string, not {}
    expect(typeof data.data.lastUpdated).toBe('string');
  });

  test('GET /agent-identities/:id/feedback returns on-chain and off-chain feedback', async ({
    request,
  }) => {
    const listResponse = await request.get(`${API_BASE_URL}/api/v1/agent-identities`);
    const listData = await listResponse.json();
    const researcher = listData.data.find(
      (a: any) => a.agentType === 'RESEARCHER' && a.reputation?.reputationScore > 0
    );

    const response = await request.get(
      `${API_BASE_URL}/api/v1/agent-identities/${researcher.id}/feedback`
    );
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThanOrEqual(4);

    // Verify on-chain feedback has onChainFeedbackId
    const onChain = data.data.filter((f: any) => f.onChainFeedbackId);
    const offChain = data.data.filter((f: any) => !f.onChainFeedbackId);
    expect(onChain.length).toBeGreaterThanOrEqual(3); // CONFIRMED_CRITICAL, HIGH, MEDIUM
    expect(offChain.length).toBeGreaterThanOrEqual(1); // REJECTED

    // Dates should be serialized
    expect(typeof data.data[0].createdAt).toBe('string');
  });

  test('GET /agent-identities/:id/escrow returns escrow balance', async ({ request }) => {
    const listResponse = await request.get(`${API_BASE_URL}/api/v1/agent-identities`);
    const listData = await listResponse.json();
    const researcher = listData.data.find(
      (a: any) => a.agentType === 'RESEARCHER' && a.reputation?.reputationScore > 0
    );

    const response = await request.get(
      `${API_BASE_URL}/api/v1/agent-identities/${researcher.id}/escrow`
    );
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.balance).toBe('5000000');
    expect(data.data.totalDeposited).toBe('10000000');
    expect(data.data.totalDeducted).toBe('5000000');
    expect(data.data.remainingSubmissions).toBe(10);
    expect(data.data.submissionFee).toBe('500000');
  });

  test('GET /agent-identities/:id/escrow/transactions returns transaction history', async ({
    request,
  }) => {
    const listResponse = await request.get(`${API_BASE_URL}/api/v1/agent-identities`);
    const listData = await listResponse.json();
    const researcher = listData.data.find(
      (a: any) => a.agentType === 'RESEARCHER' && a.reputation?.reputationScore > 0
    );

    const response = await request.get(
      `${API_BASE_URL}/api/v1/agent-identities/${researcher.id}/escrow/transactions`
    );
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThanOrEqual(2);

    const deposit = data.data.find((t: any) => t.transactionType === 'DEPOSIT');
    expect(deposit).toBeDefined();
    expect(deposit.amount).toBe('10000000');
    expect(deposit.txHash).toContain('0xdemo_escrow_deposit');

    const fee = data.data.find((t: any) => t.transactionType === 'SUBMISSION_FEE');
    expect(fee).toBeDefined();
    expect(fee.amount).toBe('500000');
  });

  test('GET /agent-identities/leaderboard returns ranked agents', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/v1/agent-identities/leaderboard`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    // Should have at least the researcher with submissions
    expect(data.data.length).toBeGreaterThanOrEqual(1);
  });
});

// =============================================
// X.402 Payment Gate Tests
// =============================================

test.describe('Workstream 2: X.402 Payment Gate', () => {
  test('POST /protocols without auth returns 401 (auth before payment gate)', async ({
    request,
  }) => {
    const csrfResponse = await request.get(`${API_BASE_URL}/api/v1/csrf-token`);
    const csrfData = await csrfResponse.json();

    const setCookieHeader = csrfResponse.headers()['set-cookie'];
    let cookieValue: string | null = null;
    if (setCookieHeader) {
      const match = (setCookieHeader as string)?.match(/X-CSRF-Token=([^;]+)/);
      if (match) cookieValue = match[1];
    }

    const response = await request.post(`${API_BASE_URL}/api/v1/protocols`, {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfData.csrfToken,
        Cookie: `X-CSRF-Token=${cookieValue}`,
      },
      data: {
        contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'base-sepolia',
        contractName: 'TestProtocol',
      },
    });

    // Auth required before payment gate triggers
    expect(response.status()).toBe(401);
  });

  test('CSRF endpoint returns valid token and cookie', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/v1/csrf-token`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.csrfToken).toBeTruthy();
    expect(typeof data.csrfToken).toBe('string');
    expect(data.csrfToken.length).toBe(64); // 32 bytes hex

    // Cookie should be set
    const setCookieHeader = response.headers()['set-cookie'];
    expect(setCookieHeader).toBeTruthy();
    expect(setCookieHeader).toContain('X-CSRF-Token=');
  });
});

// =============================================
// Frontend Route Tests (all pages require auth)
// =============================================

test.describe('Frontend: Protected Routes Redirect to Login', () => {
  test('Root "/" redirects to login for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should redirect to login or show login page
    const url = page.url();
    expect(url).toContain('/login');
  });

  test('/x402-payments redirects to login with returnUrl', async ({ page }) => {
    await page.goto('/x402-payments');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toContain('/login');
    // Should preserve the return URL
    expect(url).toContain('returnUrl');
    expect(url).toContain('x402-payments');
  });

  test('/agents redirects to login with returnUrl', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toContain('/login');
    expect(url).toContain('returnUrl');
  });

  test('/protocols/register redirects to login', async ({ page }) => {
    await page.goto('/protocols/register');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toContain('/login');
  });

  test('Login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Login page should be visible and have some connect/login UI
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    // Should have the page loaded (not a blank page)
    expect(pageContent!.length).toBeGreaterThan(50);
  });
});

// =============================================
// Frontend Build Verification
// =============================================

test.describe('Frontend: Build & Load Verification', () => {
  test('Frontend serves valid HTML', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);

    // Should have a valid HTML document
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('Frontend loads without critical JavaScript errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Filter out expected/benign errors
    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes('401') &&
        !e.includes('Unauthorized') &&
        !e.includes('favicon') &&
        !e.includes('net::ERR') &&
        !e.includes('Failed to fetch') &&
        !e.includes('SIWE')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('Frontend React app initializes successfully', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // The React root should be rendered
    const root = page.locator('#root');
    await expect(root).toBeAttached();

    // The root should have content (React rendered something)
    const rootContent = await root.textContent();
    expect(rootContent!.length).toBeGreaterThan(0);
  });
});
