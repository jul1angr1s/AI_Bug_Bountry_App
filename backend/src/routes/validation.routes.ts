import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../lib/prisma.js';

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
      where.status = status as string;
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

export default router;
