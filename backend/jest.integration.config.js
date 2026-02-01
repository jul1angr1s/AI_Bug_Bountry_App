/**
 * Jest Configuration for Integration Tests
 *
 * Integration tests run against:
 * - Local Anvil fork of Base Sepolia
 * - Test database (separate from development)
 * - Test Redis instance
 * - Mock WebSocket server
 */

export default {
  displayName: 'integration',
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['**/tests/integration/**/*.test.ts'],
  testTimeout: 60000, // 1 minute per test
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],

  // Module resolution
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Transform configuration
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'node',
          esModuleInterop: true,
        },
      },
    ],
  },

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/tests/',
  ],

  // Test environment
  testEnvironment: 'node',

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/integration/global-setup.js',
  globalTeardown: '<rootDir>/tests/integration/global-teardown.js',

  // Run tests sequentially to avoid conflicts
  maxWorkers: 1,

  // Verbose output
  verbose: true,

  // Fail fast on first error (optional)
  bail: false,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
