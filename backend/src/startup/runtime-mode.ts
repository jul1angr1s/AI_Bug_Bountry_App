export type RuntimeMode = 'all' | 'api' | 'worker';

export function resolveRuntimeMode(
  env: Record<string, string | undefined> = process.env
): RuntimeMode {
  const value = (env.APP_RUNTIME_MODE || 'all').toLowerCase();
  if (value === 'api' || value === 'worker' || value === 'all') {
    return value;
  }
  return 'all';
}

export function shouldStartBackgroundWorkers(mode: RuntimeMode): boolean {
  return mode === 'all' || mode === 'worker';
}

export function shouldStartApiServer(mode: RuntimeMode): boolean {
  return mode === 'all' || mode === 'api';
}
