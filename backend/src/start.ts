/**
 * Startup wrapper that catches ESM module resolution errors.
 *
 * When using static imports, Node.js resolves ALL imports before executing
 * any code — so console.log() at the top of server.ts never runs if an
 * import fails. Dynamic import() catches those failures.
 */
console.log('[START] Loading server module...');

try {
  await import('./server.js');
} catch (err) {
  console.error('[START] FATAL: Server failed to load');
  console.error(err);
  process.exit(1);
}

export {};
