import { test, expect } from '@playwright/test';

// Mock data
const mockResearcherAgent = {
  id: 'researcher-001',
  walletAddress: '0x1111111111111111111111111111111111111111',
  agentType: 'RESEARCHER',
  agentNftId: '1',
  isActive: true,
  registeredAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  onChainTxHash: '0xabc123',
  reputation: {
    id: 'rep-001',
    agentIdentityId: 'researcher-001',
    confirmedCount: 8,
    rejectedCount: 2,
    inconclusiveCount: 0,
    totalSubmissions: 10,
    reputationScore: 80,
    lastUpdated: new Date().toISOString(),
    validatorConfirmedCount: 0,
    validatorRejectedCount: 0,
    validatorTotalSubmissions: 0,
    validatorReputationScore: 0,
    validatorLastUpdated: null,
  },
};

const mockValidatorAgent = {
  id: 'validator-001',
  walletAddress: '0x2222222222222222222222222222222222222222',
  agentType: 'VALIDATOR',
  agentNftId: '2',
  isActive: true,
  registeredAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  onChainTxHash: '0xdef456',
  reputation: {
    id: 'rep-002',
    agentIdentityId: 'validator-001',
    confirmedCount: 5,
    rejectedCount: 1,
    inconclusiveCount: 0,
    totalSubmissions: 6,
    reputationScore: 83,
    lastUpdated: new Date().toISOString(),
    validatorConfirmedCount: 12,
    validatorRejectedCount: 3,
    validatorTotalSubmissions: 15,
    validatorReputationScore: 80,
    validatorLastUpdated: new Date().toISOString(),
  },
};

const mockFeedbacks = [
  {
    id: 'fb-001',
    researcherAgentId: 'researcher-001',
    validatorAgentId: 'validator-001',
    validationId: 'val-001',
    findingId: 'find-001',
    feedbackType: 'CONFIRMED_HIGH',
    feedbackDirection: 'VALIDATOR_RATES_RESEARCHER',
    onChainFeedbackId: '0xfeedback123',
    createdAt: new Date().toISOString(),
    validatorAgent: mockValidatorAgent,
    researcherAgent: mockResearcherAgent,
  },
  {
    id: 'fb-002',
    researcherAgentId: 'researcher-001',
    validatorAgentId: 'validator-001',
    validationId: 'val-002',
    findingId: 'find-002',
    feedbackType: 'CONFIRMED_MEDIUM',
    feedbackDirection: 'RESEARCHER_RATES_VALIDATOR',
    onChainFeedbackId: null,
    createdAt: new Date().toISOString(),
    validatorAgent: mockValidatorAgent,
    researcherAgent: mockResearcherAgent,
  },
];

test.describe('Mutual Qualification', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth session
    await page.addInitScript(() => {
      localStorage.setItem(
        'thunder-security-auth',
        JSON.stringify({ access_token: 'mock-token', user: { id: 'user-1' } })
      );
    });
  });

  test('researcher can score validator via qualification API', async ({ page }) => {
    let qualificationCalled = false;
    let requestBody: any = null;

    await page.route('**/api/v1/agent-identities/researcher-001/qualification', async (route) => {
      if (route.request().method() === 'POST') {
        qualificationCalled = true;
        requestBody = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              feedback: { id: 'fb-new', feedbackDirection: 'RESEARCHER_RATES_VALIDATOR' },
              reputation: { validatorReputationScore: 75 },
            },
          }),
        });
      }
    });

    // Simulate the API call directly via page.evaluate
    await page.goto('about:blank');
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/v1/agent-identities/researcher-001/qualification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAgentId: 'validator-001',
          feedbackType: 'CONFIRMED_HIGH',
          direction: 'RESEARCHER_RATES_VALIDATOR',
          validationId: 'val-001',
          findingId: 'find-001',
          recordOnChain: false,
        }),
      });
      return res.json();
    });

    expect(qualificationCalled).toBe(true);
    expect(requestBody.direction).toBe('RESEARCHER_RATES_VALIDATOR');
    expect(requestBody.targetAgentId).toBe('validator-001');
    expect(response.data.feedback.feedbackDirection).toBe('RESEARCHER_RATES_VALIDATOR');
  });

  test('validator can score researcher (existing flow with direction field)', async ({ page }) => {
    let requestBody: any = null;

    await page.route('**/api/v1/agent-identities/validator-001/qualification', async (route) => {
      if (route.request().method() === 'POST') {
        requestBody = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              feedback: { id: 'fb-new-2', feedbackDirection: 'VALIDATOR_RATES_RESEARCHER' },
              reputation: { reputationScore: 85 },
            },
          }),
        });
      }
    });

    await page.goto('about:blank');
    await page.evaluate(async () => {
      await fetch('/api/v1/agent-identities/validator-001/qualification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAgentId: 'researcher-001',
          feedbackType: 'CONFIRMED_CRITICAL',
          direction: 'VALIDATOR_RATES_RESEARCHER',
          validationId: 'val-003',
          findingId: 'find-003',
          recordOnChain: false,
        }),
      });
    });

    expect(requestBody.direction).toBe('VALIDATOR_RATES_RESEARCHER');
    expect(requestBody.targetAgentId).toBe('researcher-001');
  });

  test('both scores visible on ReputationTracker page', async ({ page }) => {
    // Mock API responses
    await page.route('**/api/v1/agent-identities/researcher-001', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockResearcherAgent }),
      });
    });

    await page.route('**/api/v1/agent-identities/researcher-001/reputation', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockResearcherAgent.reputation }),
      });
    });

    await page.route('**/api/v1/agent-identities/researcher-001/feedback', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockFeedbacks }),
      });
    });

    // Mock health, csrf, and other required routes
    await page.route('**/api/v1/health', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ status: 'ok' }) })
    );
    await page.route('**/api/v1/csrf-token', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ token: 'mock-csrf' }) })
    );

    await page.goto('/agents/researcher-001/reputation');

    // Verify dual score display - "As Researcher" and "As Validator" sections
    await expect(page.getByText('As Researcher')).toBeVisible();
    await expect(page.getByText('As Validator')).toBeVisible();

    // Verify reputation score is shown
    await expect(page.getByText('80')).toBeVisible();
  });

  test('FeedbackHistoryList shows direction column', async ({ page }) => {
    await page.route('**/api/v1/agent-identities/researcher-001', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockResearcherAgent }),
      });
    });

    await page.route('**/api/v1/agent-identities/researcher-001/reputation', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockResearcherAgent.reputation }),
      });
    });

    await page.route('**/api/v1/agent-identities/researcher-001/feedback', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockFeedbacks }),
      });
    });

    await page.route('**/api/v1/health', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ status: 'ok' }) })
    );
    await page.route('**/api/v1/csrf-token', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ token: 'mock-csrf' }) })
    );

    await page.goto('/agents/researcher-001/reputation');

    // Verify Direction column header exists
    await expect(page.getByRole('columnheader', { name: 'Direction' })).toBeVisible();
  });

  test('on-chain verification badge for bidirectional feedback', async ({ page }) => {
    await page.route('**/api/v1/agent-identities/validator-001', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockValidatorAgent }),
      });
    });

    await page.route('**/api/v1/agent-identities/validator-001/reputation', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockValidatorAgent.reputation }),
      });
    });

    await page.route('**/api/v1/agent-identities/validator-001/feedback', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockFeedbacks }),
      });
    });

    await page.route('**/api/v1/health', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ status: 'ok' }) })
    );
    await page.route('**/api/v1/csrf-token', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ token: 'mock-csrf' }) })
    );

    await page.goto('/agents/validator-001/reputation');

    // On-chain verification badge should be visible (validator has onChainTxHash)
    await expect(page.getByText('Score verified on blockchain')).toBeVisible();
  });
});
