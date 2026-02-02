import { describe, it, expect } from 'vitest';

/**
 * Bug Reproduction Test: Missing 'fetchBountyPoolStatus' Export
 *
 * Issue: BountyPoolStatus.tsx is trying to import 'fetchBountyPoolStatus' from '@/lib/api',
 * but this function doesn't exist in api.ts
 *
 * Browser Error: "The requested module '/src/lib/api.ts' does not provide an export named 'fetchBountyPoolStatus'"
 *
 * Current broken imports:
 * - src/components/Payment/BountyPoolStatus.tsx:8
 *
 * The component expects:
 * - fetchBountyPoolStatus(protocolId: string)
 * - BountyPoolStatusResponse type
 * - PoolTransaction type
 *
 * Expected: Tests will FAIL until the function and types are added to api.ts
 */
describe('Missing fetchBountyPoolStatus Export Bug', () => {
  it('should export fetchBountyPoolStatus function from lib/api', async () => {
    // This will fail because the 'fetchBountyPoolStatus' export doesn't exist
    const apiModule = await import('../../lib/api');

    // Check if fetchBountyPoolStatus is exported
    expect(apiModule.fetchBountyPoolStatus).toBeDefined();
    expect(typeof apiModule.fetchBountyPoolStatus).toBe('function');
  });

  it('should export BountyPoolStatusResponse type from lib/api', async () => {
    // TypeScript types are not available at runtime, but we can check the function exists
    const apiModule = await import('../../lib/api');
    expect(apiModule.fetchBountyPoolStatus).toBeDefined();
  });

  it('should export PoolTransaction type from lib/api', async () => {
    // TypeScript types are not available at runtime, but we can check the function exists
    const apiModule = await import('../../lib/api');
    expect(apiModule.fetchBountyPoolStatus).toBeDefined();
  });

  it('should be able to import BountyPoolStatus component', async () => {
    // This will fail because BountyPoolStatus imports fetchBountyPoolStatus which doesn't exist
    const bountyPoolModule = await import('../../components/Payment/BountyPoolStatus');
    expect(bountyPoolModule.BountyPoolStatus).toBeDefined();
  });
});
