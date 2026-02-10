import { test, expect } from '@playwright/test';

const API_BASE = process.env.VITE_API_BASE_URL || 'http://localhost:3000';

test.describe('Agent Selection Step', () => {
  test('agent selection step renders before protocol registration form', async ({ page }) => {
    await page.goto('/register');
    // Step 1 indicator should be active
    await expect(page.getByText('Step 1: Select Agents')).toBeVisible();
    // Agent selection dropdowns should be visible
    await expect(page.getByText('Select a researcher agent...')).toBeVisible();
    await expect(page.getByText('Select a validator agent...')).toBeVisible();
    // Protocol form should NOT be visible yet
    await expect(page.getByText('Protocol Details')).not.toBeVisible();
  });

  test('researcher dropdown loads from GET /api/v1/agent-identities/type/RESEARCHER', async ({ page }) => {
    // Mock the API endpoint
    await page.route(`${API_BASE}/api/v1/agent-identities/type/RESEARCHER`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'r-001',
              walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
              agentType: 'RESEARCHER',
              isActive: true,
              registeredAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              reputation: { reputationScore: 85, totalSubmissions: 12 },
            },
          ],
        }),
      });
    });

    await page.route(`${API_BASE}/api/v1/agent-identities/type/VALIDATOR`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto('/register');
    // Should show truncated wallet address in the dropdown
    await expect(page.locator('select').first()).toContainText('0x1234...5678');
  });

  test('validator dropdown loads from GET /api/v1/agent-identities/type/VALIDATOR', async ({ page }) => {
    await page.route(`${API_BASE}/api/v1/agent-identities/type/RESEARCHER`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.route(`${API_BASE}/api/v1/agent-identities/type/VALIDATOR`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'v-001',
              walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
              agentType: 'VALIDATOR',
              isActive: true,
              registeredAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              reputation: { reputationScore: 92, totalSubmissions: 20 },
            },
          ],
        }),
      });
    });

    await page.goto('/register');
    await expect(page.locator('select').nth(1)).toContainText('0xabcd...abcd');
  });

  test('"Continue" button disabled until both agents selected', async ({ page }) => {
    await page.route(`${API_BASE}/api/v1/agent-identities/type/RESEARCHER`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'r-001',
              walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
              agentType: 'RESEARCHER',
              isActive: true,
              registeredAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              reputation: { reputationScore: 85, totalSubmissions: 12 },
            },
          ],
        }),
      });
    });

    await page.route(`${API_BASE}/api/v1/agent-identities/type/VALIDATOR`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'v-001',
              walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
              agentType: 'VALIDATOR',
              isActive: true,
              registeredAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              reputation: { reputationScore: 92, totalSubmissions: 20 },
            },
          ],
        }),
      });
    });

    await page.goto('/register');
    const continueBtn = page.getByRole('button', { name: /Continue to Protocol Details/i });

    // Should be disabled initially
    await expect(continueBtn).toBeDisabled();

    // Select researcher
    await page.locator('select').first().selectOption('r-001');
    // Still disabled (need validator too)
    await expect(continueBtn).toBeDisabled();

    // Select validator
    await page.locator('select').nth(1).selectOption('v-001');
    // Now enabled
    await expect(continueBtn).toBeEnabled();
  });

  test('protocol form appears after agent selection completes', async ({ page }) => {
    await page.route(`${API_BASE}/api/v1/agent-identities/type/RESEARCHER`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'r-001',
              walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
              agentType: 'RESEARCHER',
              isActive: true,
              registeredAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              reputation: { reputationScore: 85, totalSubmissions: 12 },
            },
          ],
        }),
      });
    });

    await page.route(`${API_BASE}/api/v1/agent-identities/type/VALIDATOR`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'v-001',
              walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
              agentType: 'VALIDATOR',
              isActive: true,
              registeredAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              reputation: { reputationScore: 92, totalSubmissions: 20 },
            },
          ],
        }),
      });
    });

    await page.goto('/register');

    // Select both agents
    await page.locator('select').first().selectOption('r-001');
    await page.locator('select').nth(1).selectOption('v-001');

    // Click continue
    await page.getByRole('button', { name: /Continue to Protocol Details/i }).click();

    // Protocol form should now be visible
    await expect(page.getByText('Protocol Details')).toBeVisible();
    // Step 2 indicator should be active
    await expect(page.getByText('Step 2: Protocol Details')).toBeVisible();
  });
});
