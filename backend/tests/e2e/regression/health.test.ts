import { describe, it, expect } from 'vitest';
import { fetchApi, assertJsonResponse, assertDateField } from './helpers.js';

describe('Health & Infrastructure Endpoints', () => {
  describe('GET /health', () => {
    it('returns status and service checks', async () => {
      const res = await fetchApi('/health');
      expect(res.status).toBeLessThanOrEqual(503);

      const body = await assertJsonResponse<{
        status: string;
        timestamp: string;
        services: Record<string, string>;
      }>(res);

      expect(body.status).toMatch(/^(ok|degraded)$/);
      assertDateField(body.timestamp, 'timestamp');
      expect(body.services).toBeDefined();
      expect(body.services.database).toMatch(/^(ok|unreachable)$/);
      expect(body.services.redis).toMatch(/^(ok|unreachable)$/);
    });
  });

  describe('GET /health/detailed', () => {
    it('returns detailed checks including memory info', async () => {
      const res = await fetchApi('/health/detailed');
      expect(res.status).toBeLessThanOrEqual(503);

      const body = await assertJsonResponse<{
        status: string;
        timestamp: string;
        uptime: number;
        checks: {
          server: { status: string };
          database: { status: string };
          redis: { status: string };
          memory: {
            status: string;
            usedMB: number;
            totalMB: number;
            percentUsed: number;
          };
        };
      }>(res);

      expect(body.status).toMatch(/^(ok|warning|error)$/);
      assertDateField(body.timestamp, 'timestamp');
      expect(typeof body.uptime).toBe('number');
      expect(body.uptime).toBeGreaterThan(0);

      // Memory info
      expect(body.checks.memory).toBeDefined();
      expect(typeof body.checks.memory.usedMB).toBe('number');
      expect(typeof body.checks.memory.totalMB).toBe('number');
      expect(typeof body.checks.memory.percentUsed).toBe('number');

      // Service checks present
      expect(body.checks.server.status).toBeDefined();
      expect(body.checks.database.status).toBeDefined();
      expect(body.checks.redis.status).toBeDefined();
    });
  });

  describe('GET /health/services', () => {
    it('returns service-specific status fields', async () => {
      const res = await fetchApi('/health/services');
      expect(res.status).toBeLessThanOrEqual(503);

      const body = await assertJsonResponse<{
        status: string;
        timestamp: string;
        services: Record<
          string,
          { status: string; description: string }
        >;
      }>(res);

      expect(body.status).toMatch(/^(ok|degraded)$/);
      assertDateField(body.timestamp, 'timestamp');

      // Each service has status + description
      const serviceNames = [
        'validationListener',
        'bountyListener',
        'paymentWorker',
        'reconciliationService',
      ];

      for (const name of serviceNames) {
        expect(body.services[name]).toBeDefined();
        expect(typeof body.services[name].status).toBe('string');
        expect(typeof body.services[name].description).toBe('string');
      }
    });
  });

  describe('GET /metrics', () => {
    it('returns metrics data with timestamp', async () => {
      const res = await fetchApi('/metrics');
      expect(res.status).toBe(200);

      const body = await assertJsonResponse<{
        timestamp: string;
        metrics: unknown;
      }>(res);

      assertDateField(body.timestamp, 'timestamp');
      expect(body.metrics).toBeDefined();
    });
  });

  describe('Response headers', () => {
    it('includes X-API-Version header', async () => {
      const res = await fetchApi('/health');
      expect(res.headers.get('x-api-version')).toBe('1.0');
    });
  });
});
