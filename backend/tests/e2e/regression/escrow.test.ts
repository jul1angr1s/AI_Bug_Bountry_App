import { describe, it, expect } from 'vitest';
import {
  fetchApi,
  assertJsonResponse,
  assertDateField,
  assertBigIntField,
  assertNoObjectStrings,
} from './helpers.js';

interface AgentIdentity {
  id: string;
  walletAddress: string;
}

async function findAnyAgent(): Promise<string | undefined> {
  const res = await fetchApi('/agent-identities');
  const body = (await res.json()) as { data: AgentIdentity[] };
  return body.data[0]?.id;
}

describe('Escrow System Endpoints', () => {
  let agentId: string | undefined;

  describe('setup', () => {
    it('finds a test agent from seeded data', async () => {
      agentId = await findAnyAgent();
      expect(agentId).toBeDefined();
    });
  });

  describe('GET /agent-identities/:id/escrow', () => {
    it('returns escrow balance with BigInt fields as strings', async () => {
      if (!agentId) return;

      const res = await fetchApi(`/agent-identities/${agentId}/escrow`);
      expect(res.status).toBe(200);

      const body = await assertJsonResponse<{
        success: boolean;
        data: {
          balance: string;
          totalDeposited: string;
          totalDeducted: string;
          remainingSubmissions: number;
          submissionFee: string;
        };
      }>(res);

      expect(body.success).toBe(true);

      // BigInt serialization regression guards
      assertBigIntField(body.data.balance, 'balance');
      assertBigIntField(body.data.totalDeposited, 'totalDeposited');
      assertBigIntField(body.data.totalDeducted, 'totalDeducted');
      assertBigIntField(body.data.submissionFee, 'submissionFee');

      // remainingSubmissions is a plain number
      expect(typeof body.data.remainingSubmissions).toBe('number');
    });

    it('returns 404 for non-existent agent', async () => {
      const res = await fetchApi(
        '/agent-identities/00000000-0000-0000-0000-000000000000/escrow',
      );
      expect(res.status).toBe(404);

      const body = await assertJsonResponse<{
        success: boolean;
        error: string;
      }>(res);
      expect(body.success).toBe(false);
    });
  });

  describe('GET /agent-identities/:id/escrow/transactions', () => {
    it('returns array of escrow transactions', async () => {
      if (!agentId) return;

      const res = await fetchApi(
        `/agent-identities/${agentId}/escrow/transactions`,
      );
      expect(res.status).toBe(200);

      const body = await assertJsonResponse<{
        success: boolean;
        data: Array<{
          id: string;
          transactionType: string;
          amount: string;
          txHash?: string | null;
          createdAt?: string;
          [key: string]: unknown;
        }>;
      }>(res);

      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);

      for (const tx of body.data) {
        // amount must be serialized as string (BigInt)
        assertBigIntField(tx.amount, 'transaction.amount');

        // transactionType should be a known enum
        expect(typeof tx.transactionType).toBe('string');

        // Date serialization
        if (tx.createdAt !== undefined) {
          assertDateField(tx.createdAt, 'transaction.createdAt');
        }
      }
    });

    it('contains no [object Object] in any field', async () => {
      if (!agentId) return;

      const res = await fetchApi(
        `/agent-identities/${agentId}/escrow/transactions`,
      );
      const body = await assertJsonResponse<{
        success: boolean;
        data: unknown[];
      }>(res);
      assertNoObjectStrings(body.data);
    });

    it('returns 404 for non-existent agent', async () => {
      const res = await fetchApi(
        '/agent-identities/00000000-0000-0000-0000-000000000000/escrow/transactions',
      );
      expect(res.status).toBe(404);
    });
  });
});
