/**
 * Startup wrapper that catches ESM module resolution errors.
 *
 * When using static imports, Node.js resolves ALL imports before executing
 * any code — so console.log() at the top of server.ts never runs if an
 * import fails. Dynamic import() catches those failures.
 */
import { runStartupEnvPreflight, printStartupReport } from './startup/env-preflight.js';

const startupReport = runStartupEnvPreflight(process.env);
printStartupReport(startupReport);

if (!startupReport.ok) {
  console.error('[START] FATAL: Startup environment preflight failed');
  process.exit(1);
}

console.log('[START] Loading server module...');

try {
  await import('./server.js');
} catch (err) {
  console.error('[START] FATAL: Server failed to load');
  console.error(err);
  process.exit(1);
}

export {};
