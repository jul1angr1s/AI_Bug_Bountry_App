import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createProtocol,
  createScan,
  fetchScan,
  fetchScanFindings,
  subscribeToScanProgress,
} from '../../lib/api';
import {
  createMockFetch,
  resetMockApi,
  mockThunderLoanProtocol,
  mockQueuedScan,
  mockRunningScan,
  mockSucceededScan,
  mockStorageCollisionFinding,
  mockValidatedFinding,
} from '../mocks/api';
import { setupWebSocketMocks, cleanupWebSocketMocks, MockEventSource } from '../mocks/websocket';

/**
 * E2E Test Suite: Demonstration Workflow
 *
 * This test suite simulates the complete user journey for the Thunder Loan
 * vulnerability discovery demonstration:
 *
 * 1. Register Thunder Loan protocol
 * 2. Monitor protocol analysis progress
 * 3. Wait for scan completion
 * 4. Verify finding appears in list
 * 5. Verify validation completes
 * 6. Verify payment processes (mocked - full payment flow tested separately)
 *
 * All external calls (API, WebSocket) are mocked to ensure:
 * - Tests are deterministic
 * - No flaky timing issues
 * - Can run in CI/CD environment
 * - No actual backend required
 */
describe('E2E: Demonstration Workflow', () => {
  beforeEach(() => {
    // Setup mocks before each test
    resetMockApi();
    setupWebSocketMocks();

    // Mock Supabase auth to always return a valid session
    vi.mock('../../lib/supabase', () => ({
      supabase: {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                access_token: 'mock-token-123',
                user: { id: 'user-1', email: 'test@example.com' },
              },
            },
          }),
        },
      },
    }));
  });

  afterEach(() => {
    // Cleanup mocks after each test
    cleanupWebSocketMocks();
    vi.clearAllMocks();
  });

  describe('Step 1: Register Thunder Loan Protocol', () => {
    it('should successfully register Thunder Loan protocol', async () => {
      // Arrange: Prepare protocol registration data
      const protocolData = {
        name: 'Thunder Loan',
        githubUrl: 'https://github.com/Cyfrin/2023-11-Thunder-Loan',
        branch: 'main',
        contractPath: 'src/protocol',
        contractName: 'ThunderLoan',
        bountyPoolAddress: '0x1234567890123456789012345678901234567890',
        network: 'sepolia',
      };

      // Act: Call the API to register the protocol
      const response = await createProtocol(protocolData);

      // Assert: Verify the protocol was registered successfully
      expect(response).toBeDefined();
      expect(response.id).toBe(mockThunderLoanProtocol.id);
      expect(response.name).toBe('Thunder Loan');
      expect(response.status).toBe('PENDING');
      expect(response.message).toContain('registered successfully');
    });

    it('should create a scan job after protocol registration', async () => {
      // Arrange: Protocol has been registered
      const protocolId = mockThunderLoanProtocol.id;

      // Act: Trigger scan creation
      const scanResponse = await createScan({ protocolId });

      // Assert: Verify scan job was created
      expect(scanResponse).toBeDefined();
      expect(scanResponse.scanId).toBe(mockQueuedScan.id);
      expect(scanResponse.state).toBe('QUEUED');
    });
  });

  describe('Step 2: Monitor Protocol Analysis Progress', () => {
    it('should receive scan progress updates via SSE', async () => {
      // Arrange: Create a mock EventSource
      const scanId = mockQueuedScan.id;
      const progressUpdates: Array<{ step?: string; state: string }> = [];

      // Act: Subscribe to scan progress
      const unsubscribe = subscribeToScanProgress(
        scanId,
        (data) => {
          progressUpdates.push({
            step: data.step,
            state: data.state,
          });
        }
      );

      // Wait for progress updates to be received
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Assert: Verify we received progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some((update) => update.state === 'RUNNING')).toBe(true);
      expect(progressUpdates.some((update) => update.state === 'SUCCEEDED')).toBe(true);

      // Cleanup
      unsubscribe();
    });

    it('should track scan state progression: QUEUED -> RUNNING -> SUCCEEDED', async () => {
      // Arrange: Scan has been created
      const scanId = mockQueuedScan.id;

      // Act & Assert: Check scan status progression

      // First call: QUEUED
      const scan1 = await fetchScan(scanId);
      expect(scan1.state).toBe('QUEUED');
      expect(scan1.findingsCount).toBe(0);

      // Second call: RUNNING
      const scan2 = await fetchScan(scanId);
      expect(scan2.state).toBe('RUNNING');
      expect(scan2.currentStep).toBe('Analyzing smart contracts');

      // Third call: SUCCEEDED
      const scan3 = await fetchScan(scanId);
      expect(scan3.state).toBe('SUCCEEDED');
      expect(scan3.currentStep).toBe('Scan completed');
      expect(scan3.findingsCount).toBe(1);
      expect(scan3.finishedAt).toBeDefined();
    });
  });

  describe('Step 3: Wait for Scan Completion', () => {
    it('should detect when scan completes successfully', async () => {
      // Arrange: Simulate polling for scan completion
      const scanId = mockQueuedScan.id;
      const maxPolls = 5;
      let pollCount = 0;
      let scanCompleted = false;

      // Act: Poll until scan completes
      while (pollCount < maxPolls && !scanCompleted) {
        const scan = await fetchScan(scanId);
        pollCount++;

        if (scan.state === 'SUCCEEDED') {
          scanCompleted = true;
        }

        // Small delay between polls
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Assert: Verify scan completed
      expect(scanCompleted).toBe(true);
      expect(pollCount).toBeLessThanOrEqual(maxPolls);
    });

    it('should have finishedAt timestamp when scan completes', async () => {
      // Arrange: Get a completed scan
      const scanId = mockQueuedScan.id;

      // Act: Fetch scan until it's completed (after 3 calls based on mock)
      await fetchScan(scanId); // QUEUED
      await fetchScan(scanId); // RUNNING
      const completedScan = await fetchScan(scanId); // SUCCEEDED

      // Assert: Verify completion metadata
      expect(completedScan.state).toBe('SUCCEEDED');
      expect(completedScan.finishedAt).toBeDefined();
      expect(new Date(completedScan.finishedAt!).getTime()).toBeGreaterThan(0);
    });
  });

  describe('Step 4: Verify Finding Appears in List', () => {
    it('should retrieve findings after scan completes', async () => {
      // Arrange: Scan has completed
      const scanId = mockQueuedScan.id;

      // Act: Fetch findings (first call returns empty, subsequent calls return findings)
      const emptyFindings = await fetchScanFindings(scanId);
      const findingsResult = await fetchScanFindings(scanId);

      // Assert: Verify findings are present
      expect(emptyFindings.findings).toHaveLength(0);
      expect(findingsResult.findings).toHaveLength(1);
      expect(findingsResult.total).toBe(1);

      const finding = findingsResult.findings[0];
      expect(finding).toBeDefined();
      expect(finding.id).toBe(mockStorageCollisionFinding.id);
    });

    it('should display Storage Collision vulnerability details', async () => {
      // Arrange: Scan has findings
      const scanId = mockQueuedScan.id;

      // Act: Get findings (skip first call to get findings)
      await fetchScanFindings(scanId); // Empty
      const { findings } = await fetchScanFindings(scanId); // Has findings
      const finding = findings[0];

      // Assert: Verify vulnerability details
      expect(finding.vulnerabilityType).toBe('Storage Collision');
      expect(finding.severity).toBe('CRITICAL');
      expect(finding.status).toBe('PENDING');
      expect(finding.filePath).toBe('src/protocol/ThunderLoan.sol');
      expect(finding.lineNumber).toBe(245);
      expect(finding.description).toContain('Storage collision');
      expect(finding.confidenceScore).toBe(0.95);
    });

    it('should show high confidence score for the finding', async () => {
      // Arrange: Get findings
      const scanId = mockQueuedScan.id;

      // Act
      await fetchScanFindings(scanId); // Empty
      const { findings } = await fetchScanFindings(scanId); // Has findings
      const finding = findings[0];

      // Assert: Confidence score should be very high (>90%)
      expect(finding.confidenceScore).toBeGreaterThan(0.9);
      expect(finding.confidenceScore).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Step 5: Verify Validation Completes', () => {
    it('should transition finding from PENDING to VALIDATED status', async () => {
      // Arrange: Finding has been discovered
      const scanId = mockQueuedScan.id;

      // Act: Fetch findings multiple times to simulate validation progression
      await fetchScanFindings(scanId); // Empty
      const pendingResult = await fetchScanFindings(scanId); // Pending
      const validatedResult = await fetchScanFindings(scanId); // Validated

      const pendingFinding = pendingResult.findings[0];
      const validatedFinding = validatedResult.findings[0];

      // Assert: Verify status transition
      expect(pendingFinding.status).toBe('PENDING');
      expect(validatedFinding.status).toBe('VALIDATED');
    });

    it('should have proof of validation attached to finding', async () => {
      // Arrange: Finding has been validated
      const scanId = mockQueuedScan.id;

      // Act: Get validated finding
      await fetchScanFindings(scanId); // Empty
      await fetchScanFindings(scanId); // Pending
      const { findings } = await fetchScanFindings(scanId); // Validated
      const finding = findings[0];

      // Assert: Verify validation proof exists
      expect(finding.status).toBe('VALIDATED');
      expect(finding.proofs).toBeDefined();
      expect(finding.proofs).toHaveLength(1);
      expect(finding.proofs![0].status).toBe('APPROVED');
      expect(finding.proofs![0].submittedAt).toBeDefined();
    });
  });

  describe('Step 6: Verify Payment Processing (Mock)', () => {
    it('should prepare payment for validated finding', async () => {
      // Arrange: Finding has been validated
      const scanId = mockQueuedScan.id;

      // Act: Get validated finding
      await fetchScanFindings(scanId); // Empty
      await fetchScanFindings(scanId); // Pending
      const { findings } = await fetchScanFindings(scanId); // Validated
      const finding = findings[0];

      // Assert: Verify finding is ready for payment
      expect(finding.status).toBe('VALIDATED');
      expect(finding.severity).toBe('CRITICAL');

      // Note: Actual payment processing is tested separately in payment tests
      // Here we just verify the finding is in the correct state for payment
    });
  });

  describe('Complete End-to-End Workflow', () => {
    it('should complete the entire demonstration workflow successfully', async () => {
      // This test runs through all steps in sequence to ensure the complete flow works

      // Step 1: Register Protocol
      const protocolData = {
        name: 'Thunder Loan',
        githubUrl: 'https://github.com/Cyfrin/2023-11-Thunder-Loan',
        branch: 'main',
        contractPath: 'src/protocol',
        contractName: 'ThunderLoan',
        bountyPoolAddress: '0x1234567890123456789012345678901234567890',
        network: 'sepolia',
      };
      const protocolResponse = await createProtocol(protocolData);
      expect(protocolResponse.status).toBe('PENDING');

      // Step 2: Create Scan
      const scanResponse = await createScan({ protocolId: protocolResponse.id });
      const scanId = scanResponse.scanId;
      expect(scanResponse.state).toBe('QUEUED');

      // Step 3: Monitor Progress (poll until completed)
      let scan = await fetchScan(scanId);
      expect(scan.state).toBe('QUEUED');

      scan = await fetchScan(scanId);
      expect(scan.state).toBe('RUNNING');

      scan = await fetchScan(scanId);
      expect(scan.state).toBe('SUCCEEDED');
      expect(scan.findingsCount).toBe(1);

      // Step 4: Retrieve Findings
      await fetchScanFindings(scanId); // Empty initially
      let findingsResult = await fetchScanFindings(scanId);
      expect(findingsResult.findings).toHaveLength(1);

      let finding = findingsResult.findings[0];
      expect(finding.vulnerabilityType).toBe('Storage Collision');
      expect(finding.severity).toBe('CRITICAL');
      expect(finding.status).toBe('PENDING');

      // Step 5: Wait for Validation
      findingsResult = await fetchScanFindings(scanId);
      finding = findingsResult.findings[0];
      expect(finding.status).toBe('VALIDATED');
      expect(finding.proofs).toHaveLength(1);

      // Step 6: Ready for Payment
      // (Payment processing tested separately)
      expect(finding.status).toBe('VALIDATED');
      expect(finding.severity).toBe('CRITICAL');

      // Workflow completed successfully
    });
  });
});
