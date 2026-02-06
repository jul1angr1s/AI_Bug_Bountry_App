import { Router } from 'express';
import { z } from 'zod';
import { ScanState, AnalysisMethod } from '@prisma/client';
import { scanRepository, findingRepository } from '../db/repositories.js';
import { requireAuth } from '../middleware/auth.js';
import { sseAuthenticate } from '../middleware/sse-auth.js';
import { x402FindingSubmissionGate } from '../middleware/x402-payment-gate.middleware.js';
import { escrowService } from '../services/escrow.service.js';
import { ValidationError, NotFoundError } from '../errors/CustomError.js';
import { getRedisClient } from '../lib/redis.js';
import { enqueueScan } from '../queues/scanQueue.js';
import type { FindingsListResponse } from '../types/api.js';

const router = Router();

// Task 2.1: POST /api/v1/scans - Create scan job
// x.402 finding submission gate: Requires escrow balance (can be skipped via SKIP_X402_PAYMENT_GATE=true)
const createScanSchema = z.object({
  protocolId: z.string().uuid(),
  branch: z.string().optional(),
  commitHash: z.string().optional(),
  researcherAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

router.post('/', requireAuth, x402FindingSubmissionGate(), async (req, res, next) => {
  try {
    const result = createScanSchema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError('Invalid request body', result.error.errors);
    }

    const { protocolId, branch, commitHash } = result.data;

    // Deduct submission fee BEFORE creating scan (atomic: fail early if insufficient balance)
    const researcherWallet = (req as any).researcherWallet as string | undefined;
    if (researcherWallet) {
      // This throws if balance is insufficient — request fails before scan is created
      await escrowService.deductSubmissionFee(researcherWallet, `pending-${protocolId}-${Date.now()}`);
      console.log(`[Scans] Submission fee deducted for researcher ${researcherWallet}`);
    }

    // Create scan job (only after fee deduction succeeds)
    const scan = await scanRepository.createScan({
      protocolId,
      targetBranch: branch,
      targetCommitHash: commitHash,
    });

    // Enqueue scan job for researcher agent
    await enqueueScan({
      scanId: scan.id,
      protocolId,
      targetBranch: branch,
      targetCommitHash: commitHash,
    });

    // Publish scan creation event to Redis for queue workers
    const redis = getRedisClient();
    await redis.publish('scan:created', JSON.stringify({
      scanId: scan.id,
      protocolId,
      timestamp: new Date().toISOString(),
    }));

    res.status(201).json({
      scanId: scan.id,
      state: scan.state,
    });
  } catch (error) {
    next(error);
  }
});

// Task 2.2: GET /api/v1/scans/:id - Get scan status
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const scan = await scanRepository.getScanById(id);
    if (!scan) {
      throw new NotFoundError('Scan', id);
    }

    // Calculate findings summary
    const findingsSummary = {
      total: scan._count.findings,
      bySeverity: scan.findings.reduce<Record<string, number>>((acc, f) => {
        acc[f.severity] = (acc[f.severity] || 0) + 1;
        return acc;
      }, {}),
    };

    res.json({
      id: scan.id,
      state: scan.state,
      currentStep: scan.currentStep,
      startedAt: scan.startedAt,
      finishedAt: scan.completedAt,
      findingsSummary,
      errorCode: scan.errorCode,
      errorMessage: scan.errorMessage,
      retryCount: scan.retryCount,
    });
  } catch (error) {
    next(error);
  }
});

// Additional: GET /api/v1/scans/:id/findings - Get findings for a scan
// Supports optional query parameter: ?analysisMethod=AI|STATIC|HYBRID
router.get('/:id/findings', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { analysisMethod } = req.query;

    const scan = await scanRepository.getScanById(id);
    if (!scan) {
      throw new NotFoundError('Scan', id);
    }

    // Validate analysisMethod if provided
    if (analysisMethod && !['AI', 'STATIC', 'HYBRID'].includes(String(analysisMethod))) {
      throw new ValidationError('Invalid analysisMethod parameter', [
        { message: 'analysisMethod must be one of: AI, STATIC, HYBRID', path: ['analysisMethod'] },
      ]);
    }

    let findings = await findingRepository.getFindingsByScan(id);

    // Filter by analysis method if parameter is provided
    if (analysisMethod) {
      findings = findings.filter(f => f.analysisMethod === analysisMethod);
    }

    const response: FindingsListResponse = {
      scanId: id,
      findings: findings.map(f => ({
        id: f.id,
        vulnerabilityType: f.vulnerabilityType,
        severity: f.severity,
        status: f.status,
        filePath: f.filePath,
        lineNumber: f.lineNumber,
        description: f.description,
        confidenceScore: f.confidenceScore,
        createdAt: f.createdAt,
        // AI-enhanced fields
        analysisMethod: f.analysisMethod,
        aiConfidenceScore: f.aiConfidenceScore,
        remediationSuggestion: f.remediationSuggestion,
        codeSnippet: f.codeSnippet,
        proofs: f.proofs.map(p => ({
          id: p.id,
          status: p.status,
          submittedAt: p.submittedAt,
        })),
      })),
      total: findings.length,
      ...(analysisMethod && {
        filteredBy: {
          analysisMethod: analysisMethod as AnalysisMethod,
        },
      }),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Task 2.3: GET /api/v1/scans/:id/progress - SSE stream for progress
// Uses sseAuthenticate middleware because EventSource API cannot send custom headers (only cookies)
router.get('/:id/progress', sseAuthenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const scan = await scanRepository.getScanById(id);
    if (!scan) {
      throw new NotFoundError('Scan', id);
    }

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial state (matching ScanProgressEvent format)
    res.write(`data: ${JSON.stringify({
      eventType: 'scan:progress',
      timestamp: new Date().toISOString(),
      scanId: scan.id,
      protocolId: scan.protocolId,
      data: {
        currentStep: scan.currentStep,
        state: scan.state,
        progress: 0,
        message: 'Connected to scan progress stream',
      },
    })}\n\n`);

    // Subscribe to Redis for real-time updates
    const redis = getRedisClient();
    const subscriber = redis.duplicate();
    
    await subscriber.subscribe(`scan:${id}:progress`);
    
    subscriber.on('message', (_channel, message) => {
      res.write(`data: ${message}\n\n`);
      
      // Check if scan completed
      const data = JSON.parse(message);
      if (data.state === ScanState.SUCCEEDED || 
          data.state === ScanState.FAILED || 
          data.state === ScanState.CANCELED) {
        subscriber.unsubscribe();
        subscriber.quit();
        res.end();
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      subscriber.unsubscribe();
      subscriber.quit();
    });
  } catch (error) {
    next(error);
  }
});

// Task 2.4: DELETE /api/v1/scans/:id - Cancel scan
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const scan = await scanRepository.getScanById(id);
    if (!scan) {
      throw new NotFoundError('Scan', id);
    }

    // Can only cancel queued or running scans
    if (scan.state !== ScanState.QUEUED && scan.state !== ScanState.RUNNING) {
      throw new ValidationError('Cannot cancel scan', [
        { message: 'Scan is not in cancellable state', path: ['state'] },
      ]);
    }

    // Cancel the scan
    const canceledScan = await scanRepository.cancelScan(id);

    // Publish cancel event to Redis
    const redis = getRedisClient();
    await redis.publish('scan:canceled', JSON.stringify({
      scanId: id,
      timestamp: new Date().toISOString(),
    }));

    res.json({
      id: canceledScan.id,
      state: canceledScan.state,
    });
  } catch (error) {
    next(error);
  }
});

// Additional: GET /api/v1/scans - List scans (with filtering)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { protocolId, state, limit = '10' } = req.query;
    
    const scans = await scanRepository.getScansByProtocol(
      protocolId ? String(protocolId) : undefined,
      parseInt(String(limit), 10),
      state ? (String(state) as ScanState) : undefined
    );

    res.json({
      scans: scans.map(scan => ({
        id: scan.id,
        protocolId: scan.protocolId,
        state: scan.state,
        currentStep: scan.currentStep,
        startedAt: scan.startedAt,
        finishedAt: scan.completedAt,
        findingsCount: scan._count.findings,
        protocol: scan.protocol,
      })),
      total: scans.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
