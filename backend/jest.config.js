/**
 * Jest Configuration
 *
 * Note: This project primarily uses Vitest (see vitest.config.ts).
 * This configuration is maintained for legacy compatibility.
 *
 * For new tests:
 * - Use Vitest for all new tests
 * - AI tests: Use *.ai.test.ts naming convention
 * - Regular tests: Use *.test.ts naming convention
 *
 * To run tests:
 * - npm test                  # Run all tests with Vitest
 * - npm run test:ai           # Run AI integration tests only
 * - npm run test:watch        # Run tests in watch mode
 */

export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },

  // Multi-project configuration for separating AI tests from regular tests
  projects: [
    {
      displayName: 'regular',
      testMatch: ['**/tests/**/*.test.ts', '**/__tests__/**/*.test.ts'],
      testPathIgnorePatterns: ['.*\\.ai\\.test\\.ts$'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    },
    {
      displayName: 'ai',
      testMatch: ['**/*.ai.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/agents/researcher/__tests__/setup.ts'],
      testTimeout: 60000, // AI tests may take longer
    },
  ],

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
