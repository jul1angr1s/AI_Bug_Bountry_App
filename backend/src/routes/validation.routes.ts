import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../lib/prisma.js';
import { sseAuthenticate } from '../middleware/sse-auth.js';
import { getRedisClient } from '../lib/redis.js';

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
        orderBy: { validatedAt: 'desc' },
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
    console.error('[ValidationController] listValidations error:', error);
    res.status(500).json({ error: 'Failed to list validations' });
  }
});

// GET /api/v1/validations/active - Find any actively validating proof
router.get('/active', async (req, res) => {
  try {
    const activeProof = await prisma.proof.findFirst({
      where: { status: 'VALIDATING' as any },
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
    console.error('[ValidationController] getActive error:', error);
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

    // Send initial state
    res.write(`data: ${JSON.stringify({
      eventType: 'validation:progress',
      timestamp: new Date().toISOString(),
      validationId: id,
      protocolId,
      data: {
        currentStep: 'DECRYPT_PROOF',
        state: (proof.status as string) === 'VALIDATING' ? 'RUNNING' : proof.status,
        progress: 0,
        message: 'Connected to validation progress stream',
        workerType: 'LLM',
      },
    })}\n\n`);

    // Subscribe to Redis for real-time updates
    const redis = getRedisClient();
    const subscriber = redis.duplicate();

    await subscriber.subscribe(`validation:${id}:progress`);

    subscriber.on('message', (_channel: string, message: string) => {
      res.write(`data: ${message}\n\n`);

      // Check if validation completed
      try {
        const data = JSON.parse(message);
        if (data.data?.state === 'COMPLETED' || data.data?.state === 'FAILED') {
          subscriber.unsubscribe();
          subscriber.quit();
          res.end();
        }
      } catch { /* ignore parse errors */ }
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

    await subscriber.subscribe(`validation:${id}:logs`, `validation:${id}:progress`);

    subscriber.on('message', (channel: string, message: string) => {
      if (channel === `validation:${id}:logs`) {
        res.write(`data: ${message}\n\n`);
      } else if (channel === `validation:${id}:progress`) {
        // Check if validation completed to close the stream
        try {
          const data = JSON.parse(message);
          if (data.data?.state === 'COMPLETED' || data.data?.state === 'FAILED') {
            subscriber.unsubscribe();
            subscriber.quit();
            res.end();
          }
        } catch { /* ignore parse errors */ }
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

export default router;
