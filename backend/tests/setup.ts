// Jest setup file for global test configuration
import { jest } from '@jest/globals';

// Set test timeout
jest.setTimeout(10000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.BASE_SEPOLIA_RPC_URL = 'https://sepolia.base.org';
process.env.PRIVATE_KEY = '0x' + '1'.repeat(64);
process.env.RESEARCHER_PRIVATE_KEY = '0x' + '2'.repeat(64);

// Global test utilities can be added here
