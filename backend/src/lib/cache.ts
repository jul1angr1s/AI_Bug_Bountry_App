import { getRedisClient } from './redis.js';

export const CACHE_KEYS = {
  DASHBOARD_STATS: (protocolId?: string, userId?: string) => {
    if (protocolId) {
      return `dashboard:stats:protocol:${protocolId}`;
    }
    if (userId) {
      return `dashboard:stats:user:${userId}`;
    }
    return 'dashboard:stats:global';
  },
  AGENT_STATUS: (type?: string) => `agent:status:${type ?? 'all'}`,
  PROTOCOL_VULNERABILITIES: (
    protocolId: string,
    page: number,
    limit: number,
    sort: string,
    severity?: string,
    status?: string
  ) => `protocol:vulnerabilities:${protocolId}:${page}:${limit}:${sort}:${severity ?? 'all'}:${status ?? 'all'}`,
};

export const CACHE_TTL = {
  STATS: 30,
  AGENT_STATUS: 10,
  VULNERABILITIES: 60,
};

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient();
    const data = await client.get(key);
    if (data) {
      return JSON.parse(data) as T;
    }
    return null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

export async function invalidateCache(key: string): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error('Cache invalidate error:', error);
  }
}

export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    const client = await getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    console.error('Cache pattern invalidate error:', error);
  }
}

export async function getCacheStats(): Promise<{ hits: number; misses: number; keys: number }> {
  try {
    const client = await getRedisClient();
    const info = await client.info('stats');
    const keys = await client.dbsize();

    const keyspaceHits = info.match(/keyspace_hits:(\d+)/)?.[1] || '0';
    const keyspaceMisses = info.match(/keyspace_misses:(\d+)/)?.[1] || '0';

    return {
      hits: parseInt(keyspaceHits, 10),
      misses: parseInt(keyspaceMisses, 10),
      keys,
    };
  } catch (error) {
    console.error('Cache stats error:', error);
    return { hits: 0, misses: 0, keys: 0 };
  }
}
