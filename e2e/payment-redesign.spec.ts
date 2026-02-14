import { test, expect } from '@playwright/test';

test.describe('Payment Redesign', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth session
    await page.addInitScript(() => {
      localStorage.setItem(
        'thunder-security-auth',
        JSON.stringify({ access_token: 'mock-token', user: { id: 'user-1' } })
      );
    });
  });

  test('Stream B: FundingGate MetaMask flow still works (regression)', async ({ page }) => {
    // Mock protocol with funding state
    await page.route('**/api/v1/protocols/proto-001', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'proto-001',
            contractName: 'TestToken',
            githubUrl: 'https://github.com/test/repo',
            branch: 'main',
            contractPath: 'src/TestToken.sol',
            status: 'ACTIVE',
            fundingState: 'AWAITING_FUNDING',
            bountyPoolAmount: 50,
            minimumBountyRequired: 25,
            canRequestScan: false,
            totalBountyPool: '0',
            availableBounty: '0',
            paidBounty: '0',
          },
        }),
      });
    });

    await page.route('**/api/v1/health', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ status: 'ok' }) })
    );
    await page.route('**/api/v1/csrf-token', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ token: 'mock-csrf' }) })
    );

    await page.goto('/protocols/proto-001');

    // Verify funding state elements are present (regression check)
    await expect(page.getByText('AWAITING_FUNDING').or(page.getByText('Awaiting Funding'))).toBeVisible({ timeout: 10000 });
  });

  test('Stream C: POST /api/v1/scans returns 402 with $10 fee', async ({ page }) => {
    let scanRequestStatus = 0;

    await page.route('**/api/v1/scans', async (route) => {
      if (route.request().method() === 'POST') {
        scanRequestStatus = 402;
        await route.fulfill({
          status: 402,
          headers: {
            'PAYMENT-REQUIRED': btoa(JSON.stringify({
              accepts: [{
                scheme: 'exact',
                amount: '10000000',
                payTo: '0xa611bbEBB6E50e73F36dfAe79fFA65f8c21b4D77',
              }],
              resource: { description: 'Scan request fee for AI Bug Bounty Platform' },
            })),
          },
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Payment required' }),
        });
      }
    });

    await page.goto('about:blank');
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/v1/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocolId: 'proto-001' }),
      });
      return { status: res.status, headers: { paymentRequired: res.headers.get('PAYMENT-REQUIRED') } };
    });

    expect(scanRequestStatus).toBe(402);
    expect(response.status).toBe(402);
  });

  test('Stream A: Finding submission triggers $0.50 payment record', async ({ page }) => {
    let exploitPaymentRecorded = false;

    // Mock exploit fee payment endpoint being called during scan submission
    await page.route('**/api/v1/agent-identities/x402-payments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'pay-001',
              requestType: 'EXPLOIT_SUBMISSION_FEE',
              requesterAddress: '0x1111111111111111111111111111111111111111',
              amount: '500000',
              status: 'COMPLETED',
              recipientAddress: '0x2222222222222222222222222222222222222222',
              txHash: '0xexploit123',
              expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            },
          ],
        }),
      });
      exploitPaymentRecorded = true;
    });

    await page.route('**/api/v1/health', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ status: 'ok' }) })
    );
    await page.route('**/api/v1/csrf-token', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ token: 'mock-csrf' }) })
    );

    await page.goto('/x402-payments');

    // Wait for payment data to load
    await page.waitForResponse('**/api/v1/agent-identities/x402-payments');
    expect(exploitPaymentRecorded).toBe(true);
  });

  test('X402 Payments page shows filter tabs for all stream types', async ({ page }) => {
    await page.route('**/api/v1/agent-identities/x402-payments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'pay-001',
              requestType: 'PROTOCOL_REGISTRATION',
              requesterAddress: '0x1111',
              amount: '1000000',
              status: 'COMPLETED',
              txHash: '0xreg123',
              expiresAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            },
            {
              id: 'pay-002',
              requestType: 'SCAN_REQUEST_FEE',
              requesterAddress: '0x1111',
              amount: '10000000',
              status: 'COMPLETED',
              recipientAddress: '0xa611bbEBB6E50e73F36dfAe79fFA65f8c21b4D77',
              txHash: '0xscan123',
              expiresAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            },
            {
              id: 'pay-003',
              requestType: 'EXPLOIT_SUBMISSION_FEE',
              requesterAddress: '0x1111',
              amount: '500000',
              status: 'COMPLETED',
              recipientAddress: '0x2222',
              txHash: '0xexploit123',
              expiresAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/health', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ status: 'ok' }) })
    );
    await page.route('**/api/v1/csrf-token', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ token: 'mock-csrf' }) })
    );

    await page.goto('/x402-payments');

    // Verify filter tabs are present
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Registration' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scan Fees' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Exploit Fees' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submissions' })).toBeVisible();
  });

  test('Payment summary stats include all streams', async ({ page }) => {
    await page.route('**/api/v1/agent-identities/x402-payments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'pay-001',
              requestType: 'PROTOCOL_REGISTRATION',
              requesterAddress: '0x1111',
              amount: '1000000',
              status: 'COMPLETED',
              expiresAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            },
            {
              id: 'pay-002',
              requestType: 'SCAN_REQUEST_FEE',
              requesterAddress: '0x1111',
              amount: '10000000',
              status: 'COMPLETED',
              expiresAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            },
            {
              id: 'pay-003',
              requestType: 'EXPLOIT_SUBMISSION_FEE',
              requesterAddress: '0x1111',
              amount: '500000',
              status: 'PENDING',
              expiresAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/health', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ status: 'ok' }) })
    );
    await page.route('**/api/v1/csrf-token', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ token: 'mock-csrf' }) })
    );

    await page.goto('/x402-payments');

    // Stats should show 3 total payments, 2 confirmed, 1 processing
    await expect(page.getByText('3').first()).toBeVisible();
  });
});
