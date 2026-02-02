import { describe, it, expect } from 'vitest';

/**
 * Bug Reproduction Test: Missing 'fetchLeaderboard' Export
 *
 * Issue: EarningsLeaderboard.tsx is trying to import 'fetchLeaderboard' from '@/lib/api',
 * but this function doesn't exist in api.ts
 *
 * Browser Error: "The requested module '/src/lib/api.ts' does not provide an export named 'fetchLeaderboard'"
 *
 * Current broken import:
 * - src/components/Payment/EarningsLeaderboard.tsx:6
 *
 * The component expects a fetchLeaderboard function and a LeaderboardEntry type.
 *
 * Expected: Tests will FAIL until the fetchLeaderboard function is added to api.ts
 */
describe('Missing fetchLeaderboard Export Bug', () => {
  it('should export fetchLeaderboard function from lib/api', async () => {
    // This will fail because the 'fetchLeaderboard' export doesn't exist
    const apiModule = await import('../../lib/api');

    // Check if fetchLeaderboard is exported
    expect(apiModule.fetchLeaderboard).toBeDefined();
    expect(typeof apiModule.fetchLeaderboard).toBe('function');
  });

  it('should export LeaderboardEntry type from lib/api', async () => {
    // TypeScript types are not available at runtime, but we can check the function exists
    const apiModule = await import('../../lib/api');
    expect(apiModule.fetchLeaderboard).toBeDefined();
  });

  it('should be able to import EarningsLeaderboard component', async () => {
    // This will fail because EarningsLeaderboard imports fetchLeaderboard which doesn't exist
    const leaderboardModule = await import('../../components/Payment/EarningsLeaderboard');
    expect(leaderboardModule.default).toBeDefined();
  });
});
