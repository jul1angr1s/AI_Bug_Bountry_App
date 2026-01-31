import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validateRequest } from '../middleware/validation.js';
import { dashboardRateLimits } from '../middleware/rate-limit.js';
import { agentCommandSchema, protocolIdSchema } from '../schemas/protocol.schema.js';
import {
  pauseProtocolQueue,
  resumeProtocolQueue,
  getProtocolQueueStatus,
} from '../queues/protocol.queue.js';
import type { Request, Response } from 'express';

const router = Router();

// POST /api/v1/agents/:id/command - Send command to Protocol Agent
router.post(
  '/:id/command',
  requireAuth,
  requireAdmin,
  dashboardRateLimits.agents,
  validateRequest({
    params: protocolIdSchema,
    body: agentCommandSchema,
  }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { command, reason } = req.body;

      // For now, we only support protocol queue commands
      // In a full implementation, this would check agent type and route accordingly
      if (id !== 'protocol-agent') {
        return res.status(404).json({
          error: {
            code: 'AGENT_NOT_FOUND',
            message: 'Agent not found',
            requestId: req.id,
          },
        });
      }

      let result: { success: boolean; message: string };

      switch (command) {
        case 'PAUSE':
          await pauseProtocolQueue();
          result = {
            success: true,
            message: `Protocol agent paused${reason ? `: ${reason}` : ''}`,
          };
          break;
        case 'RESUME':
          await resumeProtocolQueue();
          result = {
            success: true,
            message: `Protocol agent resumed${reason ? `: ${reason}` : ''}`,
          };
          break;
        case 'STOP':
          // For now, STOP behaves like PAUSE
          await pauseProtocolQueue();
          result = {
            success: true,
            message: `Protocol agent stopped${reason ? `: ${reason}` : ''}`,
          };
          break;
        default:
          return res.status(400).json({
            error: {
              code: 'INVALID_COMMAND',
              message: `Invalid command: ${command}`,
              requestId: req.id,
            },
          });
      }

      res.json({ data: result });
    } catch (error) {
      console.error('Error in agent command:', error);
      res.status(500).json({
        error: {
          code: 'COMMAND_FAILED',
          message: 'Failed to execute agent command',
          requestId: req.id,
        },
      });
    }
  }
);

// GET /api/v1/agents/:id/status - Get specific agent status with queue info
router.get(
  '/:id/status',
  requireAuth,
  requireAdmin,
  dashboardRateLimits.agents,
  validateRequest({ params: protocolIdSchema }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (id !== 'protocol-agent') {
        return res.status(404).json({
          error: {
            code: 'AGENT_NOT_FOUND',
            message: 'Agent not found',
            requestId: req.id,
          },
        });
      }

      const status = await getProtocolQueueStatus();

      res.json({
        data: {
          id,
          type: 'PROTOCOL',
          status: status.isPaused ? 'PAUSED' : 'ACTIVE',
          queue: status.jobCounts,
        },
      });
    } catch (error) {
      console.error('Error in agent status:', error);
      res.status(500).json({
        error: {
          code: 'STATUS_FAILED',
          message: 'Failed to retrieve agent status',
          requestId: req.id,
        },
      });
    }
  }
);

export default router;
