import { PrismaClient, Prisma, Scan, ScanState, ScanStep, Finding, Proof, ScanStepRecord, AgentRun } from '@prisma/client';
import { getPrismaClient } from '../lib/prisma.js';

type ScanWithRelations = Prisma.ScanGetPayload<{
  include: {
    _count: {
      select: {
        findings: true;
      };
    };
    findings: true;
    proofs: true;
    steps: true;
    protocol: true;
    agent: true;
  };
}>;

type ScanSummary = Prisma.ScanGetPayload<{
  include: {
    findings: {
      select: {
        id: true;
        severity: true;
        status: true;
      };
    };
    protocol: {
      select: {
        id: true;
        githubUrl: true;
        contractName: true;
      };
    };
    _count: {
      select: {
        findings: true;
      };
    };
  };
}>;

type FindingWithProofs = Prisma.FindingGetPayload<{
  include: {
    proofs: true;
  };
}>;

export class ScanRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new scan job
   */
  async createScan(params: {
    protocolId: string;
    targetBranch?: string;
    targetCommitHash?: string;
  }): Promise<Scan> {
    return this.prisma.scan.create({
      data: {
        protocolId: params.protocolId,
        targetBranch: params.targetBranch,
        targetCommitHash: params.targetCommitHash,
        state: ScanState.QUEUED,
      },
    });
  }

  /**
   * Get scan by ID with all related data
   */
  async getScanById(scanId: string): Promise<ScanWithRelations | null> {
    return this.prisma.scan.findUnique({
      where: { id: scanId },
      include: {
        _count: {
          select: {
            findings: true,
          },
        },
        findings: true,
        proofs: true,
        steps: true,
        protocol: true,
        agent: true,
      },
    });
  }

  /**
   * Get scans by protocol ID
   */
  async getScansByProtocol(
    protocolId?: string,
    limit: number = 10,
    state?: ScanState
  ): Promise<ScanSummary[]> {
    return this.prisma.scan.findMany({
      where: {
        ...(protocolId ? { protocolId } : {}),
        ...(state ? { state } : {}),
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        findings: {
          select: {
            id: true,
            severity: true,
            status: true,
          },
        },
        protocol: {
          select: {
            id: true,
            githubUrl: true,
            contractName: true,
          },
        },
        _count: {
          select: {
            findings: true,
          },
        },
      },
    });
  }

  /**
   * Update scan state
   */
  async updateScanState(
    scanId: string,
    state: ScanState,
    updates?: Partial<Scan>
  ): Promise<Scan> {
    return this.prisma.scan.update({
      where: { id: scanId },
      data: {
        state,
        ...updates,
        completedAt: state === ScanState.SUCCEEDED || state === ScanState.FAILED || state === ScanState.CANCELED
          ? new Date()
          : updates?.completedAt,
      },
    });
  }

  /**
   * Update current scan step
   */
  async updateScanStep(scanId: string, step: ScanStep | null): Promise<Scan> {
    return this.prisma.scan.update({
      where: { id: scanId },
      data: { currentStep: step },
    });
  }

  /**
   * Assign scan to agent
   */
  async assignToAgent(scanId: string, agentId: string): Promise<Scan> {
    return this.prisma.scan.update({
      where: { id: scanId },
      data: {
        agentId,
        state: ScanState.RUNNING,
      },
    });
  }

  /**
   * Mark scan as failed with error details
   */
  async markScanFailed(
    scanId: string,
    errorCode: string,
    errorMessage: string
  ): Promise<Scan> {
    return this.prisma.scan.update({
      where: { id: scanId },
      data: {
        state: ScanState.FAILED,
        errorCode,
        errorMessage,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Increment retry count
   */
  async incrementRetryCount(scanId: string): Promise<Scan> {
    return this.prisma.scan.update({
      where: { id: scanId },
      data: {
        retryCount: { increment: 1 },
      },
    });
  }

  /**
   * Get queued scans ready for processing
   */
  async getQueuedScans(limit: number = 10): Promise<Scan[]> {
    return this.prisma.scan.findMany({
      where: { state: ScanState.QUEUED },
      orderBy: { startedAt: 'asc' },
      take: limit,
      include: {
        protocol: true,
      },
    });
  }

  /**
   * Cancel a scan
   */
  async cancelScan(scanId: string): Promise<Scan> {
    return this.prisma.scan.update({
      where: { id: scanId },
      data: {
        state: ScanState.CANCELED,
        completedAt: new Date(),
      },
    });
  }
}

export class FindingRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new finding
   */
  async createFinding(params: {
    scanId: string;
    vulnerabilityType: string;
    severity: string;
    filePath: string;
    lineNumber?: number;
    functionSelector?: string;
    description: string;
    confidenceScore?: number;
    aiConfidenceScore?: number;
    remediationSuggestion?: string;
    codeSnippet?: string;
    analysisMethod?: 'AI' | 'STATIC' | 'HYBRID';
  }): Promise<Finding> {
    return this.prisma.finding.create({
      data: {
        scanId: params.scanId,
        vulnerabilityType: params.vulnerabilityType,
        severity: params.severity as any,
        filePath: params.filePath,
        lineNumber: params.lineNumber,
        functionSelector: params.functionSelector,
        description: params.description,
        confidenceScore: params.confidenceScore ?? 0,
        aiConfidenceScore: params.aiConfidenceScore,
        remediationSuggestion: params.remediationSuggestion,
        codeSnippet: params.codeSnippet,
        analysisMethod: params.analysisMethod as any,
      },
    });
  }

  /**
   * Get findings by scan ID
   */
  async getFindingsByScan(scanId: string): Promise<FindingWithProofs[]> {
    return this.prisma.finding.findMany({
      where: { scanId },
      orderBy: { createdAt: 'desc' },
      include: {
        proofs: true,
      },
    });
  }

  /**
   * Update finding status
   */
  async updateFindingStatus(
    findingId: string,
    status: string
  ): Promise<Finding> {
    return this.prisma.finding.update({
      where: { id: findingId },
      data: {
        status: status as any,
        validatedAt: status === 'VALIDATED' ? new Date() : undefined,
      },
    });
  }

  /**
   * Get finding by ID with scan and protocol
   */
  async getFindingById(findingId: string): Promise<FindingWithProofs | null> {
    return this.prisma.finding.findUnique({
      where: { id: findingId },
      include: {
        proofs: true,
        scan: {
          include: {
            protocol: true,
          },
        },
      },
    });
  }
}

export class ProofRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Store a new proof
   */
  async createProof(params: {
    scanId: string;
    findingId?: string;
    encryptedPayload: string;
    researcherSignature: string;
    encryptionKeyId: string;
    ipfsCid?: string;
  }): Promise<Proof> {
    return this.prisma.proof.create({
      data: {
        scanId: params.scanId,
        findingId: params.findingId,
        encryptedPayload: params.encryptedPayload,
        researcherSignature: params.researcherSignature,
        encryptionKeyId: params.encryptionKeyId,
        ipfsCid: params.ipfsCid,
      },
    });
  }

  /**
   * Update proof status after submission/validation
   */
  async updateProofStatus(
    proofId: string,
    status: string,
    validatorPublicKey?: string
  ): Promise<Proof> {
    return this.prisma.proof.update({
      where: { id: proofId },
      data: {
        status: status as any,
        validatorPublicKey,
        validatedAt: status === 'VALIDATED' ? new Date() : undefined,
      },
    });
  }

  /**
   * Get proofs by scan ID
   */
  async getProofsByScan(scanId: string): Promise<Proof[]> {
    return this.prisma.proof.findMany({
      where: { scanId },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Get proof by ID with finding details
   */
  async getProofById(proofId: string): Promise<Proof | null> {
    return this.prisma.proof.findUnique({
      where: { id: proofId },
      include: {
        finding: true,
      },
    });
  }
}

export class ScanStepRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Record the start of a scan step
   */
  async startStep(scanId: string, step: ScanStep): Promise<ScanStepRecord> {
    return this.prisma.scanStepRecord.create({
      data: {
        scanId,
        step,
        status: 'RUNNING',
      },
    });
  }

  /**
   * Complete a scan step
   */
  async completeStep(
    stepId: string,
    metadata?: Record<string, any>
  ): Promise<ScanStepRecord> {
    return this.prisma.scanStepRecord.update({
      where: { id: stepId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        metadata: metadata ?? undefined,
      },
    });
  }

  /**
   * Mark step as failed
   */
  async failStep(
    stepId: string,
    errorCode: string,
    errorMessage: string
  ): Promise<ScanStepRecord> {
    return this.prisma.scanStepRecord.update({
      where: { id: stepId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorCode,
        errorMessage,
      },
    });
  }

  /**
   * Get steps for a scan
   */
  async getStepsByScan(scanId: string): Promise<ScanStepRecord[]> {
    return this.prisma.scanStepRecord.findMany({
      where: { scanId },
      orderBy: { startedAt: 'asc' },
    });
  }
}

export class AgentRunRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Start tracking an agent run
   */
  async startRun(params: {
    agentId: string;
    scanId?: string;
    runtimeVersion: string;
    workerId: string;
  }): Promise<AgentRun> {
    return this.prisma.agentRun.create({
      data: {
        agentId: params.agentId,
        scanId: params.scanId,
        runtimeVersion: params.runtimeVersion,
        workerId: params.workerId,
      },
    });
  }

  /**
   * Complete an agent run with metrics
   */
  async completeRun(
    runId: string,
    metrics: {
      duration: number;
      memoryUsage?: number;
      cpuUsage?: number;
    }
  ): Promise<AgentRun> {
    return this.prisma.agentRun.update({
      where: { id: runId },
      data: {
        completedAt: new Date(),
        duration: metrics.duration,
        memoryUsage: metrics.memoryUsage,
        cpuUsage: metrics.cpuUsage,
      },
    });
  }

  /**
   * Record agent run failure
   */
  async failRun(
    runId: string,
    error: {
      code: string;
      message: string;
      stackTrace?: string;
    }
  ): Promise<AgentRun> {
    return this.prisma.agentRun.update({
      where: { id: runId },
      data: {
        completedAt: new Date(),
        errorCode: error.code,
        errorMessage: error.message,
        stackTrace: error.stackTrace,
      },
    });
  }

  /**
   * Get recent runs for an agent
   */
  async getRecentRuns(agentId: string, limit: number = 10): Promise<AgentRun[]> {
    return this.prisma.agentRun.findMany({
      where: { agentId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}

// Export singleton instances
export const scanRepository = new ScanRepository();
export const findingRepository = new FindingRepository();
export const proofRepository = new ProofRepository();
export const scanStepRepository = new ScanStepRepository();
export const agentRunRepository = new AgentRunRepository();
