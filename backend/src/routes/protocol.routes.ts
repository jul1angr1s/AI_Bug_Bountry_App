import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { sseAuthenticate } from '../middleware/sse-auth.js';
import { validateRequest } from '../middleware/validation.js';
import { dashboardRateLimits } from '../middleware/rate-limit.js';
import { x402ProtocolRegistrationGate } from '../middleware/x402-payment-gate.middleware.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('ProtocolRoutes');

import {
  protocolRegistrationSchema,
  protocolFundingSchema,
  protocolIdSchema,
} from '../schemas/protocol.schema.js';
import { getPrismaClient } from '../lib/prisma.js';
import { buildProtocolRegistrationFingerprint } from '../lib/protocol-payment-fingerprint.js';
import {
  registerProtocol,
  fundProtocol,
  listProtocols,
  getProtocolById,
  deleteProtocol,
} from '../services/protocol.service.js';
import { addProtocolRegistrationJob } from '../queues/protocol.queue.js';
import { getRedisClient } from '../lib/redis.js';

const router = Router();
const prisma = getPrismaClient();

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
      log.error({ err: error }, 'Error listing protocols');
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

// GET /api/v1/protocols/versions - Get versions for a GitHub URL
router.get(
  '/versions',
  requireAuth,
  dashboardRateLimits.protocols,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const githubUrl = req.query.githubUrl as string;

      if (!githubUrl) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETER',
            message: 'githubUrl query parameter is required',
            requestId: req.id,
          },
        });
      }

      const versions = await prisma.protocol.findMany({
        where: {
          githubUrl,
          authUserId: userId,
        },
        select: {
          id: true,
          version: true,
          registrationType: true,
          status: true,
          createdAt: true,
        },
        orderBy: { version: 'desc' },
      });

      res.status(200).json({ data: versions });
    } catch (error) {
      log.error({ err: error }, 'Error fetching protocol versions');
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
      log.error({ err: error }, 'Error fetching protocol');
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
// x.402 payment gate: Requires 1 USDC payment before registration (can be skipped via SKIP_X402_PAYMENT_GATE=true)
router.post(
  '/',
  requireAuth,
  dashboardRateLimits.protocols,
  x402ProtocolRegistrationGate(),
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
        const fingerprint = buildProtocolRegistrationFingerprint(req.body || {});
        const requesterAddress = (req.body?.ownerAddress || '').toLowerCase();

        if (fingerprint && requesterAddress) {
          await prisma.x402PaymentRequest.updateMany({
            where: {
              requestType: 'PROTOCOL_REGISTRATION',
              requesterAddress,
              status: 'COMPLETED',
              protocolId: null,
              paymentReceipt: fingerprint,
            },
            data: { protocolId: result.protocol.id },
          });
        }

        await addProtocolRegistrationJob(result.protocol.id);
      }

      res.status(201).json({
        data: result.protocol,
      });
    } catch (error) {
      log.error({ err: error }, 'Error in protocol registration');
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
      log.error({ err: error }, 'Error in protocol funding');
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

// DELETE /api/v1/protocols/:id - Delete a protocol
router.delete(
  '/:id',
  requireAuth,
  dashboardRateLimits.protocols,
  validateRequest({ params: protocolIdSchema }),
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
      const result = await deleteProtocol(id, userId);

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
            code: 'DELETE_FAILED',
            message: result.error?.message || 'Failed to delete protocol',
            requestId: req.id,
          },
        });
      }

      res.status(200).json({ message: 'Protocol deleted successfully' });
    } catch (error) {
      log.error({ err: error }, 'Error deleting protocol');
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

// GET /api/v1/protocols/:id/registration-progress - SSE stream for registration progress
router.get(
  '/:id/registration-progress',
  sseAuthenticate,
  validateRequest({ params: protocolIdSchema }),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
      // Verify user has access to this protocol
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

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx

      // Send initial comment to establish connection
      res.write(': connected\n\n');

      // Subscribe to Redis channel for this protocol's registration progress
      // Note: ioredis duplicate() returns an already-connected client - no .connect() needed
      const redis = await getRedisClient();
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

      const channel = `protocol:${id}:registration`;
      await subscriber.subscribe(channel);
      log.info({ channel }, 'SSE client subscribed');

      // If protocol is already ACTIVE or FAILED, send completion event immediately
      // This fixes the race condition where registration completes before SSE connects
      if (protocol.status === 'ACTIVE') {
        const completionEvent = {
          type: 'registration_progress',
          data: {
            protocolId: id,
            currentStep: 'COMPLETED',
            state: 'COMPLETED',
            progress: 100,
            message: 'Protocol registration completed successfully',
            timestamp: new Date().toISOString()
          }
        };
        res.write(`data: ${JSON.stringify(completionEvent)}\n\n`);
        res.write('event: close\ndata: {}\n\n');
        cleanup();
        res.end();
        return;
      } else if (protocol.status === 'FAILED' || protocol.registrationState === 'FAILED') {
        const failureEvent = {
          type: 'registration_progress',
          data: {
            protocolId: id,
            currentStep: 'FAILED',
            state: 'FAILED',
            progress: 0,
            message: 'Protocol registration failed',
            timestamp: new Date().toISOString()
          }
        };
        res.write(`data: ${JSON.stringify(failureEvent)}\n\n`);
        res.write('event: close\ndata: {}\n\n');
        cleanup();
        res.end();
        return;
      }

      // Handle incoming messages from Redis
      subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const event = JSON.parse(message);
            res.write(`data: ${JSON.stringify(event)}\n\n`);

            // Close connection if registration completed or failed
            if (event.data.state === 'COMPLETED' || event.data.state === 'FAILED') {
              res.write('event: close\ndata: {}\n\n');
              cleanup();
              res.end();
            }
          } catch (err) {
            log.error({ err }, 'SSE error parsing message');
          }
        }
      });

      // Handle client disconnect
      req.on('close', () => {
        log.info({ channel }, 'SSE client disconnected');
        cleanup();
      });

      // Handle Redis errors
      subscriber.on('error', (err) => {
        log.error({ err }, 'SSE Redis subscriber error');
        cleanup();
        res.end();
      });
    } catch (error) {
      log.error({ err: error }, 'Error in registration progress SSE');
      if (!res.headersSent) {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            requestId: req.id,
          },
        });
      } else {
        res.end();
      }
    }
  }
);

export default router;
