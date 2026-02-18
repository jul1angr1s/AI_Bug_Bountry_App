import { beforeEach, describe, expect, it } from 'vitest';
import {
  isSiweNonceReplay,
  rememberSiweNonce,
  validateSiweMessageSemantics,
} from '../../lib/siwe-validation.js';

function buildSiweMessage(params: {
  domain: string;
  address: string;
  chainId?: number;
  nonce?: string;
  issuedAt?: string;
  expirationTime?: string;
}): string {
  const chainId = params.chainId ?? 84532;
  const nonce = params.nonce ?? `nonce-${Date.now()}`;
  const issuedAt = params.issuedAt ?? new Date().toISOString();
  const expirationLine = params.expirationTime
    ? `\nExpiration Time: ${params.expirationTime}`
    : '';

  return `${params.domain} wants you to sign in with your Ethereum account:
${params.address}

Sign in to Thunder Security Bug Bounty Platform

URI: http://${params.domain}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}${expirationLine}`;
}

describe('validateSiweMessageSemantics', () => {
  const wallet = '0x1111111111111111111111111111111111111111';

  beforeEach(() => {
    process.env.FRONTEND_URL = 'http://localhost:5173';
    process.env.SIWE_ALLOWED_CHAIN_IDS = '84532';
    process.env.SIWE_MAX_AGE_SECONDS = '600';
    delete process.env.SIWE_ALLOWED_DOMAINS;
  });

  it('accepts valid SIWE message semantics', () => {
    const message = buildSiweMessage({
      domain: 'localhost:5173',
      address: wallet,
      nonce: 'valid-nonce',
    });

    const result = validateSiweMessageSemantics(message, wallet);
    expect(result).toEqual({ ok: true, nonce: 'valid-nonce' });
  });

  it('rejects disallowed domain', () => {
    const message = buildSiweMessage({
      domain: 'evil.example',
      address: wallet,
      nonce: 'domain-bad',
    });

    const result = validateSiweMessageSemantics(message, wallet);
    expect(result).toEqual({ ok: false });
  });

  it('rejects disallowed chain id', () => {
    const message = buildSiweMessage({
      domain: 'localhost:5173',
      address: wallet,
      chainId: 1,
      nonce: 'chain-bad',
    });

    const result = validateSiweMessageSemantics(message, wallet);
    expect(result).toEqual({ ok: false });
  });

  it('rejects stale issued-at timestamp', () => {
    const staleIssuedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const message = buildSiweMessage({
      domain: 'localhost:5173',
      address: wallet,
      nonce: 'stale-issued-at',
      issuedAt: staleIssuedAt,
    });

    const result = validateSiweMessageSemantics(message, wallet);
    expect(result).toEqual({ ok: false });
  });
});

describe('SIWE nonce replay protection', () => {
  it('detects replayed nonces after first successful use', () => {
    const nonce = `nonce-replay-${Date.now()}`;
    expect(isSiweNonceReplay(nonce)).toBe(false);
    rememberSiweNonce(nonce);
    expect(isSiweNonceReplay(nonce)).toBe(true);
  });
});
