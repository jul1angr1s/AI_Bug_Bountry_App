import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createProtocol } from '../api';

// Mock supabase before importing api module
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            user: { email: 'test@test.com' },
          },
        },
        error: null,
      }),
    },
  },
}));

vi.mock('../csrf', () => ({
  getCsrfToken: vi.fn().mockResolvedValue('test-csrf-token'),
}));

// Helper to build a base64-encoded PAYMENT-REQUIRED header
function encodePaymentHeader(data: object): string {
  return btoa(JSON.stringify(data));
}

const testRequest = {
  githubUrl: 'https://github.com/test/repo',
  contractPath: 'src/Contract.sol',
  contractName: 'TestContract',
  bountyTerms: 'Standard',
  ownerAddress: '0x1234',
};

describe('createProtocol x402 parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('extracts paymentTerms from PAYMENT-REQUIRED header (x402 v2)', async () => {
    const headerPayload = {
      x402Version: 2,
      error: 'Payment required',
      resource: {
        url: '/api/v1/protocols',
        description: 'Protocol registration fee for AI Bug Bounty Platform',
      },
      accepts: [
        {
          scheme: 'exact',
          network: 'eip155:84532',
          asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          amount: '1000000',
          payTo: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
          maxTimeoutSeconds: 300,
          extra: {},
        },
      ],
    };

    const mockResponse = new Response('{}', {
      status: 402,
      statusText: 'Payment Required',
      headers: {
        'Content-Type': 'application/json',
        'PAYMENT-REQUIRED': encodePaymentHeader(headerPayload),
      },
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    try {
      await createProtocol(testRequest);
      expect.fail('Should have thrown');
    } catch (error: any) {
      expect(error.message).toBe('Payment required');
      expect(error.status).toBe(402);
      expect(error.paymentTerms).toBeDefined();
      expect(error.paymentTerms.recipient).toBe('0xAbCdEf1234567890AbCdEf1234567890AbCdEf12');
      expect(error.paymentTerms.amount).toBe('1000000');
      expect(error.paymentTerms.asset).toBe('USDC');
      expect(error.paymentTerms.chain).toBe('base-sepolia');
      expect(error.paymentTerms.memo).toBe('Protocol registration fee for AI Bug Bounty Platform');
      expect(error.paymentTerms.expiresAt).toBeDefined();
    }
  });

  test('falls back to body parsing when PAYMENT-REQUIRED header is absent', async () => {
    const bodyPayload = {
      x402: {
        amount: '2000000',
        payTo: '0xFallbackWallet1234567890123456789012345678',
      },
      description: 'Fallback registration fee',
    };

    const mockResponse = new Response(JSON.stringify(bodyPayload), {
      status: 402,
      statusText: 'Payment Required',
      headers: { 'Content-Type': 'application/json' },
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    try {
      await createProtocol(testRequest);
      expect.fail('Should have thrown');
    } catch (error: any) {
      expect(error.status).toBe(402);
      expect(error.paymentTerms.recipient).toBe('0xFallbackWallet1234567890123456789012345678');
      expect(error.paymentTerms.amount).toBe('2000000');
      expect(error.paymentTerms.memo).toBe('Fallback registration fee');
    }
  });

  test('uses defaults when header decode fails and body is empty', async () => {
    const mockResponse = new Response('{}', {
      status: 402,
      statusText: 'Payment Required',
      headers: {
        'Content-Type': 'application/json',
        'PAYMENT-REQUIRED': 'not-valid-base64!!!',
      },
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    try {
      await createProtocol(testRequest);
      expect.fail('Should have thrown');
    } catch (error: any) {
      expect(error.status).toBe(402);
      // Falls back to body parsing with defaults
      expect(error.paymentTerms.amount).toBe('1000000');
      expect(error.paymentTerms.recipient).toBe('');
    }
  });
});
