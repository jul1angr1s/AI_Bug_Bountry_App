import { describe, it, expect } from 'vitest';

/**
 * Bug Reproduction Test: Missing 'api' Export
 *
 * Issue: usePayments.ts and useValidations.ts are trying to import a named export 'api'
 * from '../lib/api', but this export doesn't exist in api.ts
 *
 * Browser Error: "The requested module '/src/lib/api.ts' does not provide an export named 'api'"
 *
 * Current broken imports:
 * - src/hooks/usePayments.ts:2
 * - src/hooks/useValidations.ts:2
 *
 * These hooks expect an axios-style API client with methods like:
 * - api.get(url)
 * - api.post(url, data)
 * - api.put(url, data)
 * - api.delete(url)
 *
 * But api.ts only exports individual functions like fetchProtocol, fetchScans, etc.
 *
 * Expected: Test 1 will FAIL until the api export is added
 */
describe('Missing API Export Bug', () => {
  it('should export api object from lib/api with HTTP methods', async () => {
    // This is the critical test - checking if the 'api' export exists
    const apiModule = await import('../../lib/api');

    // Check if api is exported
    expect(apiModule.api).toBeDefined();
    expect(typeof apiModule.api).toBe('object');

    // Check if api has expected HTTP methods
    expect(apiModule.api).toHaveProperty('get');
    expect(apiModule.api).toHaveProperty('post');
    expect(apiModule.api).toHaveProperty('put');
    expect(apiModule.api).toHaveProperty('delete');

    // Verify they are functions
    expect(typeof apiModule.api.get).toBe('function');
    expect(typeof apiModule.api.post).toBe('function');
    expect(typeof apiModule.api.put).toBe('function');
    expect(typeof apiModule.api.delete).toBe('function');
  });

  it('should be able to import usePayments hook without errors', async () => {
    // In Vitest, this might succeed even if api is undefined
    // because it's just importing the module, not executing the hook
    const usePaymentsModule = await import('../../hooks/usePayments');
    expect(usePaymentsModule.usePayments).toBeDefined();
    expect(typeof usePaymentsModule.usePayments).toBe('function');
  });

  it('should be able to import useValidations hook without errors', async () => {
    // In Vitest, this might succeed even if api is undefined
    // because it's just importing the module, not executing the hook
    const useValidationsModule = await import('../../hooks/useValidations');
    expect(useValidationsModule.useValidations).toBeDefined();
    expect(typeof useValidationsModule.useValidations).toBe('function');
  });

  it('should verify Payments page can be imported', async () => {
    // The Payments page uses usePayments, which uses api
    // If api doesn't exist, the page will fail to load in the browser
    const paymentsModule = await import('../../pages/Payments');
    expect(paymentsModule.default).toBeDefined();
  });

  it('should verify Validations page can be imported', async () => {
    // The Validations page uses useValidations, which uses api
    // If api doesn't exist, the page will fail to load in the browser
    const validationsModule = await import('../../pages/Validations');
    expect(validationsModule.default).toBeDefined();
  });
});
