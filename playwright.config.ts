import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: false, // Run tests sequentially since they depend on each other
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Capture screenshots: 'on' for every test, 'only-on-failure' for failures, 'off' to disable */
    screenshot: 'on',
    /* Capture video on first retry for debugging flaky tests */
    video: 'on-first-retry',
  },

  /* Set environment for E2E testing */
  env: {
    NODE_ENV: 'test',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* Dev servers are started by ./scripts/dev-improved.sh */
  // Don't start servers here - they're already managed by your initialization script
  // If servers aren't running, ensure you've executed: bash scripts/dev-improved.sh
  // Required services:
  // - Backend API: http://localhost:3000/api/v1/health
  // - Frontend: http://localhost:5173

  /* Global timeout */
  timeout: 30 * 1000,
  globalTimeout: 30 * 60 * 1000,
});
