import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../lib/prisma.js';
import { sseAuthenticate } from '../middleware/sse-auth.js';
import { getRedisClient } from '../lib/redis.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('ValidationRoutes');

const router = Router();
const prisma = getPrismaClient();

/**
 * Validation Routes
 *
 * GET /api/v1/validations - List all validations (findings with validation status)
 */

router.get('/', async (req, res) => {
  try {
    const {
      protocolId,
      status,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const where: Prisma.FindingWhereInput = {};
    if (protocolId) {
      where.scan = {
        protocolId: protocolId as string,
      };
    }
    if (status) {
      where.status = status as any;
    }

    // Query findings (which represent validations)
    const [findings, total] = await Promise.all([
      prisma.finding.findMany({
        where,
        include: {
          scan: {
            include: {
              protocol: {
                select: {
                  id: true,
                  githubUrl: true,
                },
              },
            },
          },
        },
        // Keep unvalidated findings (validatedAt = null) at the bottom so
        // freshly validated/rejected results are immediately visible.
        orderBy: {
          validatedAt: {
            sort: 'desc',
            nulls: 'last',
          },
        },
        skip,
        take: limitNum,
      }),
      prisma.finding.count({ where }),
    ]);

    res.json({
      validations: findings.map((f) => ({
        id: f.id,
        findingId: f.id,
        findingTitle: `${f.vulnerabilityType} in ${f.filePath}`,
        protocolName: f.scan?.protocol?.githubUrl.split('/').pop() || 'Unknown',
        severity: f.severity,
        status: f.status,
        confidence: Math.round(f.confidenceScore * 100),
        validatedAt: f.validatedAt?.toISOString(),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    log.error('listValidations error:', error);
    res.status(500).json({ error: 'Failed to list validations' });
  }
});

// SSE stream for global validation activity (detects any validation start/end instantly)
router.get('/activity/stream', sseAuthenticate, async (req, res, next) => {
  try {
    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Check for currently active validation and send initial state
    const activeProof = await prisma.proof.findFirst({
      where: { status: 'VALIDATING' },
      orderBy: { submittedAt: 'desc' },
      select: { id: true },
    });

    if (activeProof) {
      res.write(`data: ${JSON.stringify({
        eventType: 'validation:activity',
        activeValidationId: activeProof.id,
        state: 'RUNNING',
      })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({
        eventType: 'validation:activity',
        activeValidationId: null,
        state: 'IDLE',
      })}\n\n`);
    }

    // Subscribe to all validation progress channels via pattern
    const redis = getRedisClient();
    const subscriber = redis.duplicate();
    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, 15000);
    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      clearInterval(heartbeat);
      subscriber.punsubscribe().catch(() => {});
      subscriber.quit().catch(() => {});
    };

    await subscriber.psubscribe('validation:*:progress');

    subscriber.on('pmessage', (_pattern: string, _channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        const validationId = data.validationId;
        const state = data.data?.state;

        res.write(`data: ${JSON.stringify({
          eventType: 'validation:activity',
          activeValidationId: validationId,
          state: state === 'COMPLETED' || state === 'FAILED' ? state : 'RUNNING',
        })}\n\n`);
      } catch { /* ignore parse errors */ }
    });

    // Handle client disconnect
    req.on('close', () => {
      cleanup();
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/validations/:id - Get detailed validation info for a finding
router.get('/:id/detail', async (req, res) => {
  try {
    const { id } = req.params;

    const finding = await prisma.finding.findUnique({
      where: { id },
      include: {
        scan: {
          include: {
            protocol: {
              select: {
                id: true,
                githubUrl: true,
              },
            },
          },
        },
        proofs: {
          select: {
            id: true,
            status: true,
            submittedAt: true,
            validatedAt: true,
            onChainValidationId: true,
            onChainTxHash: true,
          },
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!finding) {
      res.status(404).json({ error: 'Validation not found' });
      return;
    }

    const proof = finding.proofs[0] || null;

    res.json({
      id: finding.id,
      findingTitle: `${finding.vulnerabilityType} in ${finding.filePath}`,
      protocolName: finding.scan?.protocol?.githubUrl.split('/').pop() || 'Unknown',
      protocolUrl: finding.scan?.protocol?.githubUrl || null,
      severity: finding.severity,
      status: finding.status,
      confidence: Math.round(finding.confidenceScore * 100),
      validatedAt: finding.validatedAt?.toISOString(),

      // Vulnerability details
      vulnerabilityType: finding.vulnerabilityType,
      filePath: finding.filePath,
      lineNumber: finding.lineNumber,
      description: finding.description,
      codeSnippet: finding.codeSnippet,
      remediationSuggestion: finding.remediationSuggestion,
      analysisMethod: finding.analysisMethod,
      aiConfidenceScore: finding.aiConfidenceScore ? Math.round(finding.aiConfidenceScore * 100) : null,

      // Proof info
      proof: proof ? {
        id: proof.id,
        status: proof.status,
        submittedAt: proof.submittedAt.toISOString(),
        validatedAt: proof.validatedAt?.toISOString(),
        onChainValidationId: proof.onChainValidationId,
        onChainTxHash: proof.onChainTxHash,
      } : null,

      // Scan context
      scanId: finding.scanId,
    });
  } catch (error) {
    log.error('getDetail error:', error);
    res.status(500).json({ error: 'Failed to get validation detail' });
  }
});

// GET /api/v1/validations/active - Find any actively validating proof
router.get('/active', async (req, res) => {
  try {
    const activeProof = await prisma.proof.findFirst({
      where: { status: 'VALIDATING' },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        status: true,
        findingId: true,
        submittedAt: true,
      },
    });

    res.json({ activeValidation: activeProof });
  } catch (error) {
    log.error('getActive error:', error);
    res.status(500).json({ error: 'Failed to check active validations' });
  }
});

// SSE stream for validation progress
router.get('/:id/progress', sseAuthenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Look up proof to verify it exists and get protocolId
    const proof = await prisma.proof.findUnique({
      where: { id },
      include: {
        finding: {
          include: {
            scan: {
              select: { protocolId: true },
            },
          },
        },
      },
    });

    if (!proof) {
      res.status(404).json({ error: 'Validation not found' });
      return;
    }

    const protocolId = proof.finding?.scan?.protocolId || 'unknown';

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Subscribe to Redis FIRST so we don't miss events during the initial state read
    const redis = getRedisClient();
    const subscriber = redis.duplicate();
    const bufferedMessages: string[] = [];
    let streaming = false;
    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, 15000);
    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      clearInterval(heartbeat);
      subscriber.unsubscribe().catch(() => {});
      subscriber.quit().catch(() => {});
    };

    subscriber.on('message', (_channel: string, message: string) => {
      if (!streaming) {
        bufferedMessages.push(message);
        return;
      }
      res.write(`data: ${message}\n\n`);

      // Check if validation completed
      try {
        const data = JSON.parse(message);
        if (data.data?.state === 'COMPLETED' || data.data?.state === 'FAILED') {
          cleanup();
          res.end();
        }
      } catch { /* ignore parse errors */ }
    });

    await subscriber.subscribe(`validation:${id}:progress`);

    // Read cached latest progress (set by emitValidationProgress)
    const cachedProgress = await redis.get(`validation:${id}:current-progress`);
    const initialState = cachedProgress
      ? cachedProgress
      : JSON.stringify({
          eventType: 'validation:progress',
          timestamp: new Date().toISOString(),
          validationId: id,
          protocolId,
          data: {
            currentStep: 'DECRYPT_PROOF',
            state: proof.status === 'VALIDATING' ? 'RUNNING' : proof.status,
            progress: 0,
            message: 'Connected to validation progress stream',
            workerType: 'LLM',
          },
        });

    // Send initial state (real current progress or fallback)
    res.write(`data: ${initialState}\n\n`);

    // Flush any events that arrived while we were reading the cache
    for (const msg of bufferedMessages) {
      res.write(`data: ${msg}\n\n`);
    }
    streaming = true;

    // Check if cached state was already terminal (validation finished before SSE connected)
    if (cachedProgress) {
      try {
        const cached = JSON.parse(cachedProgress);
        if (cached.data?.state === 'COMPLETED' || cached.data?.state === 'FAILED') {
          cleanup();
          res.end();
          return;
        }
      } catch { /* ignore */ }
    }

    // Handle client disconnect
    req.on('close', () => {
      cleanup();
    });
  } catch (error) {
    next(error);
  }
});

// SSE stream for validation logs (terminal output)
router.get('/:id/logs', sseAuthenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const proof = await prisma.proof.findUnique({
      where: { id },
      include: {
        finding: {
          include: {
            scan: {
              select: { protocolId: true },
            },
          },
        },
      },
    });

    if (!proof) {
      res.status(404).json({ error: 'Validation not found' });
      return;
    }

    const protocolId = proof.finding?.scan?.protocolId || 'unknown';

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial connection event
    res.write(`data: ${JSON.stringify({
      eventType: 'validation:log',
      timestamp: new Date().toISOString(),
      validationId: id,
      protocolId,
      data: {
        level: 'INFO',
        message: 'Connected to validation log stream',
      },
    })}\n\n`);

    // Subscribe to Redis for real-time log and progress updates
    const redis = getRedisClient();
    const subscriber = redis.duplicate();
    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, 15000);
    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      clearInterval(heartbeat);
      subscriber.unsubscribe().catch(() => {});
      subscriber.quit().catch(() => {});
    };

    await subscriber.subscribe(`validation:${id}:logs`, `validation:${id}:progress`);

    subscriber.on('message', (channel: string, message: string) => {
      if (channel === `validation:${id}:logs`) {
        res.write(`data: ${message}\n\n`);
      } else if (channel === `validation:${id}:progress`) {
        // Check if validation completed to close the stream
        try {
          const data = JSON.parse(message);
          if (data.data?.state === 'COMPLETED' || data.data?.state === 'FAILED') {
            cleanup();
            res.end();
          }
        } catch { /* ignore parse errors */ }
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      cleanup();
    });
  } catch (error) {
    next(error);
  }
});

export default router;
