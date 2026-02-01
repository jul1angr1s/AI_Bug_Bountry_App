import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validateRequest } from '../middleware/validation.js';
import { dashboardRateLimits } from '../middleware/rate-limit.js';
import {
  protocolRegistrationSchema,
  protocolFundingSchema,
  protocolIdSchema,
} from '../schemas/protocol.schema.js';
import {
  registerProtocol,
  fundProtocol,
  listProtocols,
  getProtocolById,
} from '../services/protocol.service.js';
import { addProtocolRegistrationJob } from '../queues/protocol.queue.js';
import type { Request, Response } from 'express';

const router = Router();

// GET /api/v1/protocols - List all protocols
router.get(
  '/',
  requireAuth,
  dashboardRateLimits.protocols,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { status, page, limit } = req.query;

      const result = await listProtocols({
        status: status as string | undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        userId, // List user's own protocols
      });

      res.status(200).json(result);
    } catch (error) {
      console.error('Error listing protocols:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          requestId: req.id,
        },
      });
    }
  }
);

// GET /api/v1/protocols/:id - Get protocol details
router.get(
  '/:id',
  requireAuth,
  dashboardRateLimits.protocols,
  validateRequest({ params: protocolIdSchema }),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const protocol = await getProtocolById(id, userId);

      if (!protocol) {
        return res.status(404).json({
          error: {
            code: 'PROTOCOL_NOT_FOUND',
            message: 'Protocol not found or access denied',
            requestId: req.id,
          },
        });
      }

      res.status(200).json({ data: protocol });
    } catch (error) {
      console.error('Error fetching protocol:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          requestId: req.id,
        },
      });
    }
  }
);

// POST /api/v1/protocols - Register new protocol
router.post(
  '/',
  requireAuth,
  dashboardRateLimits.protocols,
  validateRequest({ body: protocolRegistrationSchema }),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User ID not found',
            requestId: req.id,
          },
        });
      }

      const result = await registerProtocol(userId, req.body);

      if (!result.success) {
        if (result.error?.code === 'DUPLICATE_GITHUB_URL') {
          return res.status(409).json({
            error: {
              code: 'DUPLICATE_GITHUB_URL',
              message: result.error.message,
              requestId: req.id,
            },
          });
        }
        return res.status(500).json({
          error: {
            code: 'REGISTRATION_FAILED',
            message: result.error?.message || 'Registration failed',
            requestId: req.id,
          },
        });
      }

      // Queue protocol registration job
      if (result.protocol?.id) {
        await addProtocolRegistrationJob(result.protocol.id);
      }

      res.status(201).json({
        data: result.protocol,
      });
    } catch (error) {
      console.error('Error in protocol registration:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          requestId: req.id,
        },
      });
    }
  }
);

// POST /api/v1/protocols/:id/fund - Fund protocol bounty pool
router.post(
  '/:id/fund',
  requireAuth,
  dashboardRateLimits.protocols,
  validateRequest({
    params: protocolIdSchema,
    body: protocolFundingSchema,
  }),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User ID not found',
            requestId: req.id,
          },
        });
      }

      const { id } = req.params;
      const result = await fundProtocol(id, userId, req.body);

      if (!result.success) {
        if (result.error?.code === 'PROTOCOL_NOT_FOUND') {
          return res.status(404).json({
            error: {
              code: 'PROTOCOL_NOT_FOUND',
              message: result.error.message,
              requestId: req.id,
            },
          });
        }
        return res.status(500).json({
          error: {
            code: 'FUNDING_FAILED',
            message: result.error?.message || 'Funding failed',
            requestId: req.id,
          },
        });
      }

      res.status(200).json({
        data: result.funding,
      });
    } catch (error) {
      console.error('Error in protocol funding:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          requestId: req.id,
        },
      });
    }
  }
);

export default router;
