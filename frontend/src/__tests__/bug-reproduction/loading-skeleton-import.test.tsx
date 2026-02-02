import { describe, it, expect } from 'vitest';

/**
 * Bug Reproduction Test: LoadingSkeleton Import Error
 *
 * Issue: Multiple files are importing LoadingSkeleton incorrectly.
 * LoadingSkeleton is a named export, not a default export.
 *
 * Current incorrect imports (default import):
 * - import LoadingSkeleton from '../components/shared/LoadingSkeleton';
 *
 * Correct import should be (named import):
 * - import { LoadingSkeleton } from '../components/shared/LoadingSkeleton';
 *
 * Affected files:
 * - frontend/src/pages/Protocols.tsx (line 5)
 * - frontend/src/pages/Scans.tsx (line 5)
 * - frontend/src/pages/ProtocolDetail.tsx (line 6)
 * - frontend/src/components/protocols/ProtocolStats.tsx (line 2)
 *
 * This test verifies that all pages and components can be imported without errors.
 */
describe('LoadingSkeleton Import Bug', () => {
  it('should be able to import LoadingSkeleton from correct shared directory', async () => {
    // This should work - LoadingSkeleton exists at the correct path with named export
    const loadingSkeletonModule = await import('../../components/shared/LoadingSkeleton');
    expect(loadingSkeletonModule.LoadingSkeleton).toBeDefined();
    expect(typeof loadingSkeletonModule.LoadingSkeleton).toBe('function');
  });

  it('should be able to import Payments page', async () => {
    const paymentsModule = await import('../../pages/Payments');
    expect(paymentsModule.default).toBeDefined();
    expect(paymentsModule.default.name).toBe('Payments');
  });

  it('should be able to import Validations page', async () => {
    const validationsModule = await import('../../pages/Validations');
    expect(validationsModule.default).toBeDefined();
    expect(validationsModule.default.name).toBe('Validations');
  });

  it('should be able to import Protocols page', async () => {
    const protocolsModule = await import('../../pages/Protocols');
    expect(protocolsModule.default).toBeDefined();
    expect(protocolsModule.default.name).toBe('Protocols');
  });

  it('should be able to import Scans page', async () => {
    const scansModule = await import('../../pages/Scans');
    expect(scansModule.default).toBeDefined();
    expect(scansModule.default.name).toBe('Scans');
  });

  it('should be able to import ProtocolDetail page', async () => {
    const protocolDetailModule = await import('../../pages/ProtocolDetail');
    expect(protocolDetailModule.default).toBeDefined();
    expect(protocolDetailModule.default.name).toBe('ProtocolDetail');
  });

  it('should be able to import ProtocolStats component', async () => {
    const protocolStatsModule = await import('../../components/protocols/ProtocolStats');
    expect(protocolStatsModule.default).toBeDefined();
  });
});
