type StartupIssueSeverity = 'error' | 'warning';

interface StartupIssue {
  severity: StartupIssueSeverity;
  code: string;
  message: string;
  fix: string;
}

export interface StartupReport {
  ok: boolean;
  issues: StartupIssue[];
}

function exists(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function isValidUrl(value: string | undefined): boolean {
  if (!exists(value)) return false;
  try {
    new URL(value as string);
    return true;
  } catch {
    return false;
  }
}

function hasTrailingSlash(value: string): boolean {
  return value.endsWith('/');
}

function hasCommaSeparatedOrigins(value: string): boolean {
  return value.includes(',');
}

export function runStartupEnvPreflight(env: NodeJS.ProcessEnv = process.env): StartupReport {
  const issues: StartupIssue[] = [];

  const requiredCore = [
    'NODE_ENV',
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'FRONTEND_URL',
  ] as const;

  for (const key of requiredCore) {
    if (!exists(env[key])) {
      issues.push({
        severity: 'error',
        code: 'MISSING_REQUIRED_ENV',
        message: `${key} is required`,
        fix: `Set ${key} in Railway backend variables.`,
      });
    }
  }

  const frontendUrl = env.FRONTEND_URL;
  if (exists(frontendUrl) && !isValidUrl(frontendUrl)) {
    issues.push({
      severity: 'error',
      code: 'INVALID_FRONTEND_URL',
      message: 'FRONTEND_URL must be a valid URL',
      fix: 'Use an absolute URL like https://frontend-production-e29e.up.railway.app',
    });
  }

  if (exists(frontendUrl) && isValidUrl(frontendUrl)) {
    const url = frontendUrl as string;

    if (hasTrailingSlash(url)) {
      issues.push({
        severity: 'error',
        code: 'FRONTEND_URL_TRAILING_SLASH',
        message: 'FRONTEND_URL has a trailing slash; CORS origin matching is exact',
        fix: 'Remove trailing slash. Example: https://frontend-production-e29e.up.railway.app',
      });
    }

    if (hasCommaSeparatedOrigins(url)) {
      issues.push({
        severity: 'error',
        code: 'FRONTEND_URL_MULTI_ORIGIN',
        message: 'FRONTEND_URL contains multiple origins, but backend CORS expects a single exact origin',
        fix: 'Set exactly one frontend origin in FRONTEND_URL.',
      });
    }
  }

  const privateKey = env.PRIVATE_KEY;
  const walletPrivateKey = env.WALLET_PRIVATE_KEY;
  const privateKey2 = env.PRIVATE_KEY2;

  if (!exists(privateKey) && !exists(walletPrivateKey)) {
    issues.push({
      severity: 'error',
      code: 'MISSING_PAYER_KEY',
      message: 'PRIVATE_KEY or WALLET_PRIVATE_KEY is required during backend module initialization',
      fix: 'Set PRIVATE_KEY (or WALLET_PRIVATE_KEY) in Railway backend variables.',
    });
  }

  if (!exists(privateKey2)) {
    issues.push({
      severity: 'error',
      code: 'MISSING_RESEARCHER_KEY',
      message: 'PRIVATE_KEY2 is required during backend module initialization',
      fix: 'Set PRIVATE_KEY2 in Railway backend variables.',
    });
  }

  if (!exists(env.REDIS_URL) && !exists(env.REDIS_HOST)) {
    issues.push({
      severity: 'warning',
      code: 'REDIS_NOT_CONFIGURED',
      message: 'REDIS_URL/REDIS_HOST not set; queue workers may fail or reconnect continuously',
      fix: 'Attach Railway Redis and set REDIS_URL.',
    });
  }

  if (!exists(env.SUPABASE_JWT_SECRET)) {
    issues.push({
      severity: 'warning',
      code: 'SUPABASE_JWT_SECRET_MISSING',
      message: 'SUPABASE_JWT_SECRET not set; /api/v1/auth/siwe token generation will fail',
      fix: 'Set SUPABASE_JWT_SECRET in Railway backend variables.',
    });
  }

  return {
    ok: !issues.some((issue) => issue.severity === 'error'),
    issues,
  };
}

export function printStartupReport(report: StartupReport): void {
  if (report.issues.length === 0) {
    console.log('[STARTUP_ENV] OK: startup environment preflight passed');
    return;
  }

  for (const issue of report.issues) {
    const level = issue.severity.toUpperCase();
    console[issue.severity === 'error' ? 'error' : 'warn'](
      `[STARTUP_ENV][${level}][${issue.code}] ${issue.message}. Fix: ${issue.fix}`
    );
  }
}
