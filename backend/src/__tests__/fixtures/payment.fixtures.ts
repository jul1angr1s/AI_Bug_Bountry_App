import type { PaymentStatus, Severity, VulnerabilityStatus } from '@prisma/client';
import { createProtocolFixture } from './protocol.fixtures';

// ============================================================================
// Payment Fixtures
// ============================================================================

export function createPaymentFixture(overrides: Partial<typeof basePayment> = {}) {
  return { ...basePayment, ...overrides };
}

const basePayment = {
  id: 'payment-test-001',
  vulnerabilityId: 'vuln-test-001',
  amount: 5.0,
  currency: 'USDC',
  status: 'PENDING' as PaymentStatus,
  txHash: null as string | null,
  onChainBountyId: null as string | null,
  researcherAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  reconciled: false,
  reconciledAt: null as Date | null,
  failureReason: null as string | null,
  retryCount: 0,
  queuedAt: new Date('2026-01-15T10:00:00Z'),
  paidAt: null as Date | null,
  idempotencyKey: null as string | null,
  processedAt: null as Date | null,
  createdAt: new Date('2026-01-15T10:00:00Z'),
  updatedAt: new Date('2026-01-15T10:00:00Z'),
};

export const completedPayment = createPaymentFixture({
  id: 'payment-test-002',
  status: 'COMPLETED' as PaymentStatus,
  txHash: '0xabc123def456',
  onChainBountyId: '0xbounty123',
  paidAt: new Date('2026-01-15T12:00:00Z'),
  reconciled: true,
  reconciledAt: new Date('2026-01-15T12:05:00Z'),
});

export const failedPayment = createPaymentFixture({
  id: 'payment-test-003',
  status: 'FAILED' as PaymentStatus,
  failureReason: 'Insufficient pool balance',
  retryCount: 3,
});

export const processingPayment = createPaymentFixture({
  id: 'payment-test-004',
  status: 'PROCESSING' as PaymentStatus,
  processedAt: new Date('2026-01-15T11:00:00Z'),
});

// ============================================================================
// Vulnerability Fixtures
// ============================================================================

export function createVulnerabilityFixture(overrides: Partial<typeof baseVulnerability> = {}) {
  return { ...baseVulnerability, ...overrides };
}

const baseVulnerability = {
  id: 'vuln-test-001',
  protocolId: 'protocol-test-001',
  vulnerabilityHash: '0xhash123abc',
  severity: 'HIGH' as Severity,
  status: 'ACKNOWLEDGED' as VulnerabilityStatus,
  discoveredAt: new Date('2026-01-14T08:00:00Z'),
  bounty: 5.0 as number | null,
  proof: null as string | null,
};

export const criticalVulnerability = createVulnerabilityFixture({
  id: 'vuln-test-002',
  severity: 'CRITICAL' as Severity,
  bounty: 50.0,
});

export const lowVulnerability = createVulnerabilityFixture({
  id: 'vuln-test-003',
  severity: 'LOW' as Severity,
  bounty: 0.5,
});

// ============================================================================
// Payment with Relations (as returned by Prisma include)
// ============================================================================

export function createPaymentWithVulnerability(
  paymentOverrides: Partial<typeof basePayment> = {},
  vulnOverrides: Partial<typeof baseVulnerability> = {},
) {
  const vulnerability = createVulnerabilityFixture(vulnOverrides);
  return {
    ...createPaymentFixture(paymentOverrides),
    vulnerability,
  };
}

export function createPaymentWithFullRelations(
  paymentOverrides: Partial<typeof basePayment> = {},
) {
  const vulnerability = createVulnerabilityFixture();
  const protocol = createProtocolFixture();
  return {
    ...createPaymentFixture(paymentOverrides),
    vulnerability: {
      ...vulnerability,
      protocol,
    },
  };
}

// ============================================================================
// Proof Fixtures
// ============================================================================

export const mockProof = {
  id: 'proof-test-001',
  findingId: 'finding-test-001',
  encryptedPayload: 'encrypted-data-here',
  onChainValidationId: '0xvalidation123',
  status: 'VALIDATED',
  createdAt: new Date('2026-01-14T09:00:00Z'),
  updatedAt: new Date('2026-01-14T09:00:00Z'),
  validatedAt: null as Date | null,
};

// Helper: proof with finding relation
export const mockProofWithFinding = {
  ...mockProof,
  finding: {
    id: 'finding-test-001',
    severity: 'HIGH' as Severity,
    scan: {
      protocolId: 'protocol-test-001',
    },
  },
};

