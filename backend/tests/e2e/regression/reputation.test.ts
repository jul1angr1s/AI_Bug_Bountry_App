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
  reputation?: { reputationScore: number } | null;
}

/**
 * Find the first agent that has a reputation record (seeded data).
 */
async function findAgentWithReputation(): Promise<string | undefined> {
  const res = await fetchApi('/agent-identities');
  const body = (await res.json()) as { data: AgentIdentity[] };

  const agent = body.data.find(
    (a) => a.reputation && a.reputation.reputationScore > 0,
  );
  return agent?.id;
}

async function findAnyAgent(): Promise<string | undefined> {
  const res = await fetchApi('/agent-identities');
  const body = (await res.json()) as { data: AgentIdentity[] };
  return body.data[0]?.id;
}

describe('Reputation & Feedback Endpoints', () => {
  let agentIdWithReputation: string | undefined;
  let anyAgentId: string | undefined;

  // Discover agents once before all tests
  describe('setup', () => {
    it('finds test agents from seeded data', async () => {
      agentIdWithReputation = await findAgentWithReputation();
      anyAgentId = await findAnyAgent();

      // At least one agent should exist in seeded data
      expect(anyAgentId).toBeDefined();
    });
  });

  describe('GET /agent-identities/:id/reputation', () => {
    it('returns reputation data with correct shape', async () => {
      const id = agentIdWithReputation ?? anyAgentId;
      if (!id) return;

      const res = await fetchApi(`/agent-identities/${id}/reputation`);

      // 200 if reputation exists, 404 if not — both are valid
      if (res.status === 404) return;

      expect(res.status).toBe(200);

      const body = await assertJsonResponse<{
        success: boolean;
        data: {
          reputationScore: number;
          confirmedCount: number;
          totalSubmissions: number;
          lastUpdated: string;
          [key: string]: unknown;
        };
      }>(res);

      expect(body.success).toBe(true);
      expect(typeof body.data.reputationScore).toBe('number');
      expect(typeof body.data.confirmedCount).toBe('number');
      expect(typeof body.data.totalSubmissions).toBe('number');
      assertDateField(body.data.lastUpdated, 'lastUpdated');
    });

    it('returns error for invalid ID (not 500)', async () => {
      const res = await fetchApi(
        '/agent-identities/00000000-0000-0000-0000-000000000000/reputation',
      );

      // Should be 404 (agent not found), not 500
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('GET /agent-identities/:id/feedback', () => {
    it('returns array of feedback items', async () => {
      const id = anyAgentId;
      if (!id) return;

      const res = await fetchApi(`/agent-identities/${id}/feedback`);
      expect(res.status).toBe(200);

      const body = await assertJsonResponse<{
        success: boolean;
        data: Array<{
          id: string;
          onChainFeedbackId?: string | null;
          createdAt?: string;
          [key: string]: unknown;
        }>;
      }>(res);

      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);

      // Validate date/BigInt serialization in feedback items
      for (const feedback of body.data) {
        if (feedback.createdAt !== undefined) {
          assertDateField(feedback.createdAt, 'feedback.createdAt');
        }
        if (feedback.onChainFeedbackId !== undefined) {
          assertBigIntField(
            feedback.onChainFeedbackId,
            'feedback.onChainFeedbackId',
          );
        }
      }
    });

    it('contains no [object Object] in any field', async () => {
      const id = anyAgentId;
      if (!id) return;

      const res = await fetchApi(`/agent-identities/${id}/feedback`);
      const body = await assertJsonResponse<{
        success: boolean;
        data: unknown[];
      }>(res);
      assertNoObjectStrings(body.data);
    });

    it('returns 404 for non-existent agent', async () => {
      const res = await fetchApi(
        '/agent-identities/00000000-0000-0000-0000-000000000000/feedback',
      );
      expect(res.status).toBe(404);
    });
  });
});
