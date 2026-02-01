/**
 * Vitest Setup File
 *
 * This file runs before all tests to configure the test environment.
 */

import { vi } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.AI_ANALYSIS_ENABLED = process.env.AI_ANALYSIS_ENABLED || 'true';

// Mock external services if needed
if (process.env.MOCK_EXTERNAL_SERVICES === 'true') {
  // Mock LLM API calls
  vi.mock('anthropic', () => ({
    default: vi.fn(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                findings: [],
                metrics: {
                  totalFindings: 0,
                  enhancedFindings: 0,
                  newFindings: 0,
                },
              }),
            },
          ],
        }),
      },
    })),
  }));
}

// Global test utilities
global.testUtils = {
  // Add any global test utilities here
};

export {};
