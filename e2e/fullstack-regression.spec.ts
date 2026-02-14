/**
 * Full-Stack Playwright Regression Test Suite
 *
 * Walks through every major page of the app — authenticated — taking
 * screenshots at each step and cross-validating backend API response
 * shapes (BigInt, Date serialization, no `[object Object]`).
 *
 * Prerequisites:
 *   - Backend running at http://localhost:3000
 *   - Frontend running at http://localhost:5173
 *   - Demo data seeded via `npx tsx backend/scripts/seed-demo-data.ts`
 */

import { test, expect } from '@playwright/test';
import {
  authenticateSIWE,
  injectAuthSession,
  assertDateField,
  assertBigIntField,
  assertNoObjectStrings,
  type AuthSession,
} from './helpers/auth';

const API = 'http://localhost:3000/api/v1';
const SCREENSHOT_DIR = 'test-results/screenshots/fullstack';

// Shared state across serial tests
let session: AuthSession;
let seededAgentId: string;

// ═══════════════════════════════════════════════
// Block 1: Unauthenticated Experience
// ═══════════════════════════════════════════════

test.describe('Block 1: Unauthenticated Experience', () => {
  test('1 — Login page renders', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Login page should show some connect/sign-in UI
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(50);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-login-page.png`,
      fullPage: true,
    });
  });

  test('2 — Root redirects to login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/login');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-root-redirect.png`,
      fullPage: true,
    });
  });

  test('3 — /agents redirects to login with returnUrl', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/login');
    expect(page.url()).toContain('returnUrl');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-agents-redirect.png`,
      fullPage: true,
    });
  });

  test('4 — Backend health check', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.services.database).toBe('ok');
    expect(data.services.redis).toBe('ok');
  });
});

// ═══════════════════════════════════════════════
// Block 2 + 3: Authenticated Flow (serial — shares session)
// ═══════════════════════════════════════════════

test.describe.serial('Block 2+3: Authenticated Pages', () => {
  // ─── Block 2: Authentication Setup ───

  test('5 — SIWE authentication via API', async ({ request }) => {
    session = await authenticateSIWE(request);

    expect(session.access_token).toBeTruthy();
    expect(session.user.id).toBeTruthy();
    expect(session.walletAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  test('6 — Inject session + verify dashboard loads', async ({ page }) => {
    await injectAuthSession(page, session);

    // Navigate to root — should NOT redirect to /login
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Give lazy-loaded components time to render
    await page.waitForTimeout(2000);

    expect(page.url()).not.toContain('/login');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-dashboard-authenticated.png`,
      fullPage: true,
    });
  });

  // ─── Block 3: Authenticated Page Walk + Backend Cross-Validation ───

  test('7 — Dashboard page loads with content', async ({ page }) => {
    await injectAuthSession(page, session);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Dashboard has "Bug Bounty Dashboard" heading or agent status section
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(100);

    // Cross-validate: fetch agent identities from API
    const res = await page.request.get(`${API}/agent-identities`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);

    // Serialization regression checks on agent data
    assertNoObjectStrings(data, 'agent-identities');
    if (data.data.length > 0) {
      const agent = data.data[0];
      assertDateField(agent.registeredAt, 'agent.registeredAt');
      assertBigIntField(agent.agentNftId, 'agent.agentNftId');
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-dashboard-content.png`,
      fullPage: true,
    });
  });

  test('8 — Agent Registry: page + API cross-validation', async ({ page }) => {
    await injectAuthSession(page, session);
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // Wait for heading
    await expect(page.locator('h1:has-text("Agent Registry")')).toBeVisible({
      timeout: 10000,
    });

    // Fetch API data
    const res = await page.request.get(`${API}/agent-identities`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThanOrEqual(2);

    // Store a seeded agent ID for sub-page tests
    const seeded = data.data.find((a: any) => a.agentNftId !== null);
    expect(seeded).toBeDefined();
    seededAgentId = seeded.id;

    // Serialization regression
    assertNoObjectStrings(data, 'agent-identities');
    for (const agent of data.data) {
      assertDateField(agent.registeredAt, `agent[${agent.id}].registeredAt`);
      assertDateField(agent.lastUpdated, `agent[${agent.id}].lastUpdated`);
      assertBigIntField(agent.agentNftId, `agent[${agent.id}].agentNftId`);
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-agent-registry.png`,
      fullPage: true,
    });
  });

  test('9 — Agent Reputation: page + API cross-validation', async ({ page }) => {
    expect(seededAgentId).toBeTruthy();

    await injectAuthSession(page, session);
    await page.goto(`/agents/${seededAgentId}/reputation`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('h1:has-text("Reputation Tracker")'),
    ).toBeVisible({ timeout: 10000 });

    // API cross-validation
    const res = await page.request.get(
      `${API}/agent-identities/${seededAgentId}/reputation`,
    );
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.reputationScore).toBeGreaterThan(0);

    // Serialization regression
    assertNoObjectStrings(data, 'reputation');
    assertDateField(data.data.lastUpdated, 'reputation.lastUpdated');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-agent-reputation.png`,
      fullPage: true,
    });
  });

  test('10 — Agent Escrow: page + API cross-validation', async ({ page }) => {
    expect(seededAgentId).toBeTruthy();

    await injectAuthSession(page, session);
    await page.goto(`/agents/${seededAgentId}/escrow`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('h1:has-text("Escrow Dashboard")'),
    ).toBeVisible({ timeout: 10000 });

    // API cross-validation
    const res = await page.request.get(
      `${API}/agent-identities/${seededAgentId}/escrow`,
    );
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);

    // Serialization regression on escrow fields
    assertNoObjectStrings(data, 'escrow');
    assertBigIntField(data.data.balance, 'escrow.balance');
    assertBigIntField(data.data.totalDeposited, 'escrow.totalDeposited');
    assertBigIntField(data.data.totalDeducted, 'escrow.totalDeducted');
    assertBigIntField(data.data.submissionFee, 'escrow.submissionFee');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-agent-escrow.png`,
      fullPage: true,
    });
  });

  test('11 — X.402 Payments: page + API cross-validation', async ({ page }) => {
    await injectAuthSession(page, session);
    await page.goto('/x402-payments');
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('h1:has-text("x.402 Payment Events")'),
    ).toBeVisible({ timeout: 10000 });

    // API cross-validation
    const res = await page.request.get(`${API}/agent-identities/x402-payments`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThanOrEqual(3);

    // Serialization regression
    assertNoObjectStrings(data, 'x402-payments');
    for (const payment of data.data) {
      assertDateField(payment.createdAt, `x402[${payment.id}].createdAt`);
      assertBigIntField(payment.amount, `x402[${payment.id}].amount`);
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-x402-payments.png`,
      fullPage: true,
    });
  });

  test('12 — Protocols: page loads (auth-protected)', async ({ page }) => {
    await injectAuthSession(page, session);
    await page.goto('/protocols');
    await page.waitForLoadState('networkidle');

    // Wait for either the heading or an empty-state message
    await page.waitForTimeout(3000);
    expect(page.url()).not.toContain('/login');

    // API cross-validation (authenticated)
    const res = await page.request.get(`${API}/protocols`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    // Protocols may be empty for a fresh test wallet, but response should be an array
    expect(Array.isArray(data)).toBe(true);

    // Serialization regression (if data exists)
    if (data.length > 0) {
      assertNoObjectStrings(data, 'protocols');
      assertDateField(data[0].createdAt, 'protocol.createdAt');
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-protocols.png`,
      fullPage: true,
    });
  });

  test('13 — Protocol Registration: form renders', async ({ page }) => {
    await injectAuthSession(page, session);
    await page.goto('/protocols/register');
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('h1:has-text("Register Protocol")'),
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/11-protocol-registration.png`,
      fullPage: true,
    });
  });

  test('14 — Scans: page loads (auth-protected)', async ({ page }) => {
    await injectAuthSession(page, session);
    await page.goto('/scans');
    await page.waitForLoadState('networkidle');

    // Heading is "All Scans" or "Protocol Scans"
    await page.waitForTimeout(3000);
    expect(page.url()).not.toContain('/login');

    // API cross-validation (authenticated)
    const res = await page.request.get(`${API}/scans`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    // Scans endpoint may return 200 with data or empty
    if (res.ok()) {
      const data = await res.json();
      assertNoObjectStrings(data, 'scans');
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/12-scans.png`,
      fullPage: true,
    });
  });

  test('15 — Validations: page renders', async ({ page }) => {
    await injectAuthSession(page, session);
    await page.goto('/validations');
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('h1:has-text("Validations")'),
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/13-validations.png`,
      fullPage: true,
    });
  });

  test('16 — Payments: page renders', async ({ page }) => {
    await injectAuthSession(page, session);
    await page.goto('/payments');
    await page.waitForLoadState('networkidle');

    // Heading is "USDC Payments & Rewards" in an h2
    await expect(
      page.locator('h2:has-text("USDC Payments")'),
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/14-payments.png`,
      fullPage: true,
    });
  });
});
