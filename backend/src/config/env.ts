import dotenv from 'dotenv';
import { z } from 'zod';
import { createLogger } from '../lib/logger.js';

const log = createLogger('EnvConfig');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  FRONTEND_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  log.error({ validationErrors: parsed.error.flatten() }, 'Invalid environment configuration');
  process.exit(1);
}

export const config = parsed.data;
export type AppConfig = typeof config;
