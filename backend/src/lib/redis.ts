import { Redis } from 'ioredis';

let redisClient: Redis | null = null;
let connectionPromise: Promise<Redis> | null = null;

async function createConnection(): Promise<Redis> {
  // Parse REDIS_URL or use individual env vars
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD || 'redis_dev_2024';

  let client: Redis;

  if (redisUrl) {
    // Try to parse URL
    try {
      const url = new URL(redisUrl);
      client = new Redis({
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        password: url.password || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        retryStrategy: (times: number) => {
          if (times > 3) {
            return null;
          }
          return Math.min(times * 100, 3000);
        },
      });
    } catch (error) {
      console.error('Failed to parse REDIS_URL, using defaults:', error);
      client = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        retryStrategy: (times: number) => {
          if (times > 3) {
            return null;
          }
          return Math.min(times * 100, 3000);
        },
      });
    }
  } else {
    client = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        if (times > 3) {
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });
  }

  client.on('error', (err: Error) => {
    console.error('Redis client error:', err);
  });

  // Wait for 'ready' event before returning
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Redis connection timeout after 10 seconds'));
    }, 10000);

    client.once('ready', () => {
      clearTimeout(timeout);
      console.log('Redis client connected');
      resolve(client);
    });

    client.once('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export async function getRedisClient(): Promise<Redis> {
  // If already connected, return immediately
  if (redisClient && redisClient.status === 'ready') {
    return redisClient;
  }

  // If connection in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  // Start new connection
  connectionPromise = createConnection();

  try {
    redisClient = await connectionPromise;
    return redisClient;
  } finally {
    connectionPromise = null;
  }
}

export async function pingRedis(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    console.error('Redis ping failed:', error);
    return false;
  }
}
