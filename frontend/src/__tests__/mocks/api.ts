import { vi } from 'vitest';
import type {
  CreateProtocolResponse,
  Scan,
  Finding,
  ProtocolListItem,
} from '../../lib/api';

/**
 * Mock data for Thunder Loan protocol
 */
export const mockThunderLoanProtocol: ProtocolListItem = {
  id: 'proto-thunder-loan-001',
  name: 'Thunder Loan',
  githubUrl: 'https://github.com/Cyfrin/2023-11-Thunder-Loan',
  status: 'ACTIVE',
  riskScore: 75,
  scansCount: 1,
  vulnerabilitiesCount: 1,
  createdAt: new Date('2024-01-15T10:00:00Z').toISOString(),
  version: 1,
  registrationType: 'INITIAL',
};

/**
 * Mock scan in QUEUED state
 */
export const mockQueuedScan: Scan = {
  id: 'scan-001',
  protocolId: mockThunderLoanProtocol.id,
  state: 'QUEUED',
  startedAt: new Date('2024-01-15T10:05:00Z').toISOString(),
  findingsCount: 0,
  retryCount: 0,
  protocol: {
    id: mockThunderLoanProtocol.id,
    githubUrl: mockThunderLoanProtocol.githubUrl,
    contractName: 'ThunderLoan',
  },
};

/**
 * Mock scan in RUNNING state
 */
export const mockRunningScan: Scan = {
  ...mockQueuedScan,
  state: 'RUNNING',
  currentStep: 'Analyzing smart contracts',
};

/**
 * Mock scan in SUCCEEDED state
 */
export const mockSucceededScan: Scan = {
  ...mockQueuedScan,
  state: 'SUCCEEDED',
  currentStep: 'Scan completed',
  finishedAt: new Date('2024-01-15T10:15:00Z').toISOString(),
  findingsCount: 1,
};

/**
 * Mock finding - Storage Collision vulnerability
 */
export const mockStorageCollisionFinding: Finding = {
  id: 'finding-001',
  vulnerabilityType: 'Storage Collision',
  severity: 'CRITICAL',
  status: 'PENDING',
  filePath: 'src/protocol/ThunderLoan.sol',
  lineNumber: 245,
  description: 'Storage collision detected in upgradeable contract. The storage layout is not compatible with the implementation contract.',
  confidenceScore: 0.95,
  createdAt: new Date('2024-01-15T10:15:00Z').toISOString(),
};

/**
 * Mock finding with validation completed
 */
export const mockValidatedFinding: Finding = {
  ...mockStorageCollisionFinding,
  status: 'VALIDATED',
  proofs: [
    {
      id: 'proof-001',
      status: 'APPROVED',
      submittedAt: new Date('2024-01-15T10:20:00Z').toISOString(),
    },
  ],
};

/**
 * Mock API responses
 */
export const mockApiResponses = {
  // Protocol creation response
  createProtocol: (): CreateProtocolResponse => ({
    id: mockThunderLoanProtocol.id,
    name: mockThunderLoanProtocol.name,
    status: 'PENDING',
    message: 'Protocol registered successfully. Scan will begin shortly.',
  }),

  // Scan creation response
  createScan: () => ({
    scanId: mockQueuedScan.id,
    state: 'QUEUED',
  }),

  // Scan status responses (simulating progression)
  getScanQueued: () => mockQueuedScan,
  getScanRunning: () => mockRunningScan,
  getScanSucceeded: () => mockSucceededScan,

  // Findings responses
  getScanFindingsEmpty: () => ({
    scanId: mockQueuedScan.id,
    findings: [],
    total: 0,
  }),
  getScanFindingsPending: () => ({
    scanId: mockQueuedScan.id,
    findings: [mockStorageCollisionFinding],
    total: 1,
  }),
  getScanFindingsValidated: () => ({
    scanId: mockQueuedScan.id,
    findings: [mockValidatedFinding],
    total: 1,
  }),

  // Protocol list response
  getProtocols: () => ({
    protocols: [mockThunderLoanProtocol],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    },
  }),
};

/**
 * Mock fetch function for API calls
 * Simulates the demonstration workflow sequence
 */
export function createMockFetch() {
  let scanCallCount = 0;
  let findingsCallCount = 0;

  return vi.fn((url: string, options?: RequestInit) => {
    // Mock POST /api/v1/protocols - Register protocol
    if (url.includes('/api/v1/protocols') && options?.method === 'POST') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiResponses.createProtocol()),
      } as Response);
    }

    // Mock POST /api/v1/scans - Create scan
    if (url.includes('/api/v1/scans') && options?.method === 'POST') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiResponses.createScan()),
      } as Response);
    }

    // Mock GET /api/v1/scans/:id - Get scan status (simulates progression)
    if (url.match(/\/api\/v1\/scans\/scan-\d+$/) && !options?.method) {
      scanCallCount++;
      let response;

      // Simulate scan progression: QUEUED -> RUNNING -> SUCCEEDED
      if (scanCallCount === 1) {
        response = mockApiResponses.getScanQueued();
      } else if (scanCallCount === 2) {
        response = mockApiResponses.getScanRunning();
      } else {
        response = mockApiResponses.getScanSucceeded();
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response),
      } as Response);
    }

    // Mock GET /api/v1/scans/:id/findings - Get findings (simulates validation)
    if (url.includes('/findings') && !options?.method) {
      findingsCallCount++;
      let response;

      // Simulate findings progression: empty -> pending -> validated
      if (findingsCallCount === 1) {
        response = mockApiResponses.getScanFindingsEmpty();
      } else if (findingsCallCount === 2) {
        response = mockApiResponses.getScanFindingsPending();
      } else {
        response = mockApiResponses.getScanFindingsValidated();
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response),
      } as Response);
    }

    // Mock GET /api/v1/protocols - Get protocols list
    if (url.includes('/api/v1/protocols') && !options?.method) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiResponses.getProtocols()),
      } as Response);
    }

    // Default: return 404 for unmocked endpoints
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ error: 'Endpoint not mocked' }),
    } as Response);
  });
}

/**
 * Reset mock state
 */
export function resetMockApi() {
  global.fetch = createMockFetch();
}
