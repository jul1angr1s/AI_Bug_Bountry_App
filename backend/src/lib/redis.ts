import { Redis } from 'ioredis';
import { createLogger } from './logger.js';

const log = createLogger('Redis');

let redisClient: Redis | null = null;

export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: null;
  enableReadyCheck: true;
  retryStrategy: (times: number) => number | null;
}

export function getRedisConnectionOptions(): RedisConnectionOptions {
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD || '';

  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        password: url.password || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        retryStrategy: (times: number) => {
          if (times > 3) return null;
          return Math.min(times * 100, 3000);
        },
      };
    } catch (error) {
      log.error('Failed to parse REDIS_URL, falling back to host/port env:', error);
    }
  }

  return {
    host: redisHost,
    port: redisPort,
    password: redisPassword || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy: (times: number) => {
      if (times > 3) return null;
      return Math.min(times * 100, 3000);
    },
  };
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(getRedisConnectionOptions());

    redisClient.on('error', (err: Error) => {
      log.error('Redis client error:', err);
    });

    redisClient.on('connect', () => {
      log.info('Redis client connected');
    });
  }

  return redisClient;
}

export async function pingRedis(): Promise<boolean> {
  try {
    const client = getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    log.error('Redis ping failed:', error);
    return false;
  }
}
