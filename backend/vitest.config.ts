import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest Configuration
 *
 * This configuration supports both regular E2E tests and AI integration tests:
 * - Regular tests: Run with AI_ANALYSIS_ENABLED=false (default)
 * - AI tests: Use *.ai.test.ts naming and require AI_ANALYSIS_ENABLED=true
 *
 * Test commands:
 * - npm test                     # Run all tests (excludes AI tests by default)
 * - npm run test:ai              # Run AI integration tests only
 * - npm test -- --exclude="**\/*.ai.test.ts"  # Explicitly exclude AI tests
 * - npm run test:watch           # Run tests in watch mode
 * - npm run test:coverage        # Run tests with coverage
 */

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/agents/researcher/__tests__/setup.ts'],

    // Include all test files
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    // Exclude directories and AI tests by default (use --exclude override in CI)
    exclude: [
      'node_modules',
      'dist',
      '.opencode',
      // AI tests are excluded by default and run separately
      // Use: npm run test:ai to run them explicitly
    ],

    // Timeouts
    testTimeout: 30000,      // 30s for regular tests
    hookTimeout: 30000,      // 30s for setup/teardown

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.ai.test.ts',
        '**/tests/**',
        '**/__tests__/**',
      ],
      // Coverage thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },

    // Reporter configuration
    reporters: ['default'],

    // Output configuration (optional, can be added if needed)
    // outputFile: {
    //   json: './test-results/results.json',
    // },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
