/**
 * Security Configuration & Startup Guards
 *
 * This module performs compile-time safety checks to prevent
 * insecure configurations from reaching production.
 * Import this file early in server.ts before middleware registration.
 */

// CRITICAL: Block DEV_AUTH_BYPASS in all environments
// This variable is no longer supported and must be removed.
if (process.env.DEV_AUTH_BYPASS) {
  throw new Error(
    'FATAL: DEV_AUTH_BYPASS environment variable detected. ' +
    'This variable is no longer supported and has been removed for security. ' +
    'Remove it from your environment configuration. ' +
    'For development testing, use proper Supabase authentication or test mocks.'
  );
}

// Warn about missing security-critical env vars in production
if (process.env.NODE_ENV === 'production') {
  const required = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`[SECURITY] Missing required environment variable: ${key}`);
    }
  }
}

export const securityConfig = {
  csrfEnabled: process.env.DISABLE_CSRF !== 'true',
  bodyLimit: '1mb',
  rateLimitWindow: 60, // seconds
} as const;
