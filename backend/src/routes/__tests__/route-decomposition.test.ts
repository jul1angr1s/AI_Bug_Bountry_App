import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

function countLines(relativePath: string): number {
  const filePath = path.resolve(process.cwd(), relativePath);
  return readFileSync(filePath, 'utf8').split('\n').length;
}

describe('route decomposition safety', () => {
  it('keeps oversized route modules below maintainability threshold', () => {
    expect(countLines('src/routes/agent-identity.routes.ts')).toBeLessThanOrEqual(250);
    expect(countLines('src/routes/payment.routes.ts')).toBeLessThanOrEqual(250);
  });

  it('uses decomposed subrouter entrypoints for high-risk domains', () => {
    const paymentRoute = readFileSync(
      path.resolve(process.cwd(), 'src/routes/payment.routes.ts'),
      'utf8'
    );
    const agentIdentityRoute = readFileSync(
      path.resolve(process.cwd(), 'src/routes/agent-identity.routes.ts'),
      'utf8'
    );

    expect(paymentRoute).toContain("./payment/index.js");
    expect(agentIdentityRoute).toContain("./agent-identity/index.js");
  });
});
