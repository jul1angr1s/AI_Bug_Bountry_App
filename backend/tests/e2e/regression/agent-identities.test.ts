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
  agentType: string;
  agentNftId: string | null;
  status: string;
  registeredAt: string;
  reputation?: {
    reputationScore: number;
    confirmedCount: number;
    totalSubmissions: number;
    lastUpdated: string;
  } | null;
  [key: string]: unknown;
}

interface AgentListResponse {
  success: boolean;
  data: AgentIdentity[];
}

interface AgentSingleResponse {
  success: boolean;
  data: AgentIdentity;
}

describe('ERC-8004 Agent Identity Endpoints', () => {
  let firstAgentId: string | undefined;
  let firstAgentWallet: string | undefined;

  describe('GET /agent-identities', () => {
    it('returns an array with success:true', async () => {
      const res = await fetchApi('/agent-identities');
      expect(res.status).toBe(200);

      const body = await assertJsonResponse<AgentListResponse>(res);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);

      // Stash first agent for subsequent tests
      if (body.data.length > 0) {
        firstAgentId = body.data[0].id;
        firstAgentWallet = body.data[0].walletAddress;
      }
    });

    it('serializes BigInt fields as strings (not errors)', async () => {
      const res = await fetchApi('/agent-identities');
      const body = await assertJsonResponse<AgentListResponse>(res);

      for (const agent of body.data) {
        assertBigIntField(agent.agentNftId, `agent[${agent.id}].agentNftId`);
      }
    });

    it('serializes Date fields as ISO strings (not {})', async () => {
      const res = await fetchApi('/agent-identities');
      const body = await assertJsonResponse<AgentListResponse>(res);

      for (const agent of body.data) {
        assertDateField(agent.registeredAt, `agent[${agent.id}].registeredAt`);
      }
    });

    it('contains no [object Object] in any string field', async () => {
      const res = await fetchApi('/agent-identities');
      const body = await assertJsonResponse<AgentListResponse>(res);
      assertNoObjectStrings(body.data);
    });
  });

  describe('GET /agent-identities/:id', () => {
    it('returns a single agent with correct shape', async () => {
      if (!firstAgentId) return;

      const res = await fetchApi(`/agent-identities/${firstAgentId}`);
      expect(res.status).toBe(200);

      const body = await assertJsonResponse<AgentSingleResponse>(res);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(firstAgentId);
      expect(typeof body.data.walletAddress).toBe('string');
      expect(body.data.agentType).toMatch(/^(RESEARCHER|VALIDATOR)$/);

      assertDateField(body.data.registeredAt, 'registeredAt');
      assertBigIntField(body.data.agentNftId, 'agentNftId');
    });

    it('returns 404 for non-existent ID', async () => {
      const res = await fetchApi(
        '/agent-identities/00000000-0000-0000-0000-000000000000',
      );
      expect(res.status).toBe(404);

      const body = await assertJsonResponse<{
        success: boolean;
        error: string;
      }>(res);
      expect(body.success).toBe(false);
    });
  });

  describe('GET /agent-identities/wallet/:address', () => {
    it('returns agent by wallet address', async () => {
      if (!firstAgentWallet) return;

      const res = await fetchApi(
        `/agent-identities/wallet/${firstAgentWallet}`,
      );
      expect(res.status).toBe(200);

      const body = await assertJsonResponse<AgentSingleResponse>(res);
      expect(body.success).toBe(true);
      expect(body.data.walletAddress.toLowerCase()).toBe(
        firstAgentWallet.toLowerCase(),
      );
    });

    it('returns 404 for unknown wallet', async () => {
      const res = await fetchApi(
        '/agent-identities/wallet/0x0000000000000000000000000000000000000000',
      );
      expect(res.status).toBe(404);
    });
  });

  describe('GET /agent-identities/type/:agentType', () => {
    it('returns RESEARCHER agents', async () => {
      const res = await fetchApi('/agent-identities/type/RESEARCHER');
      expect(res.status).toBe(200);

      const body = await assertJsonResponse<AgentListResponse>(res);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);

      for (const agent of body.data) {
        expect(agent.agentType).toBe('RESEARCHER');
      }
    });

    it('returns VALIDATOR agents', async () => {
      const res = await fetchApi('/agent-identities/type/VALIDATOR');
      expect(res.status).toBe(200);

      const body = await assertJsonResponse<AgentListResponse>(res);
      expect(body.success).toBe(true);
      for (const agent of body.data) {
        expect(agent.agentType).toBe('VALIDATOR');
      }
    });

    it('returns 400 for invalid agent type', async () => {
      const res = await fetchApi('/agent-identities/type/INVALID');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /agent-identities/leaderboard', () => {
    it('returns a ranked list of agents', async () => {
      const res = await fetchApi('/agent-identities/leaderboard');
      expect(res.status).toBe(200);

      const body = await assertJsonResponse<AgentListResponse>(res);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('respects limit query parameter', async () => {
      const res = await fetchApi('/agent-identities/leaderboard?limit=2');
      expect(res.status).toBe(200);

      const body = await assertJsonResponse<AgentListResponse>(res);
      expect(body.data.length).toBeLessThanOrEqual(2);
    });
  });
});
