import { vi } from 'vitest';

/**
 * Create a mock Redis client for unit testing.
 * Mimics ioredis API surface used in the codebase.
 */
export function createMockRedis() {
  const store = new Map<string, string>();

  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) || null)),
    set: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    del: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve(1);
    }),
    publish: vi.fn().mockResolvedValue(1),
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    duplicate: vi.fn(() => createMockRedis()),
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
    keys: vi.fn().mockResolvedValue([]),
    // Queue-like operations
    lpush: vi.fn().mockResolvedValue(1),
    rpush: vi.fn().mockResolvedValue(1),
    lpop: vi.fn().mockResolvedValue(null),
    rpop: vi.fn().mockResolvedValue(null),
    lrange: vi.fn().mockResolvedValue([]),
    llen: vi.fn().mockResolvedValue(0),
    // Hash operations
    hget: vi.fn().mockResolvedValue(null),
    hset: vi.fn().mockResolvedValue(1),
    hdel: vi.fn().mockResolvedValue(1),
    hgetall: vi.fn().mockResolvedValue({}),
    // Utility
    _store: store,
    _reset: () => store.clear(),
  };
}

export type MockRedisClient = ReturnType<typeof createMockRedis>;
