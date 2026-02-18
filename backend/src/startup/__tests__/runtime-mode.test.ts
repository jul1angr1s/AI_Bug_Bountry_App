import { describe, it, expect } from 'vitest';
import { resolveRuntimeMode, shouldStartBackgroundWorkers } from '../runtime-mode.js';

describe('runtime mode resolution', () => {
  it('defaults to all when unset', () => {
    const mode = resolveRuntimeMode({});
    expect(mode).toBe('all');
    expect(shouldStartBackgroundWorkers(mode)).toBe(true);
  });

  it('supports api-only mode without worker startup', () => {
    const mode = resolveRuntimeMode({ APP_RUNTIME_MODE: 'api' });
    expect(mode).toBe('api');
    expect(shouldStartBackgroundWorkers(mode)).toBe(false);
  });

  it('supports worker-only mode for isolated background processing', () => {
    const mode = resolveRuntimeMode({ APP_RUNTIME_MODE: 'worker' });
    expect(mode).toBe('worker');
    expect(shouldStartBackgroundWorkers(mode)).toBe(true);
  });
});
