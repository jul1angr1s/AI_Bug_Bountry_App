import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { dashboardRateLimits } from '../middleware/rate-limit.js';
import { protocolIdSchema } from '../schemas/protocol.schema.js';
import { z } from 'zod';
import {
  verifyProtocolFunding,
  requestScan,
  recordFundingTransaction,
  getProtocolFundingStatus,
} from '../services/funding.service.js';
import type { Request, Response } from 'express';

const router = Router();

// Schema for request-scan endpoint
const requestScanSchema = z.object({
  branch: z.string().optional(),
});

// Schema for record-funding endpoint
const recordFundingSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
});

/**
 * POST /api/v1/protocols/:id/verify-funding
 * Verify protocol funding by checking on-chain balance
 */
router.post(
  '/:id/verify-funding',
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
      const result = await verifyProtocolFunding(id, userId);

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'FUNDING_VERIFICATION_FAILED',
            message: result.message,
            requestId: req.id,
          },
          data: {
            fundingState: result.fundingState,
            onChainBalance: result.onChainBalance,
            requestedAmount: result.requestedAmount,
            canRequestScan: result.canRequestScan,
          },
        });
      }

      res.status(200).json({
        data: {
          fundingState: result.fundingState,
          onChainBalance: result.onChainBalance,
          requestedAmount: result.requestedAmount,
          canRequestScan: result.canRequestScan,
          message: result.message,
        },
      });
    } catch (error) {
      console.error('Error verifying funding:', error);
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

/**
 * POST /api/v1/protocols/:id/request-scan
 * Request a scan for a funded protocol
 */
router.post(
  '/:id/request-scan',
  requireAuth,
  dashboardRateLimits.protocols,
  validateRequest({
    params: protocolIdSchema,
    body: requestScanSchema,
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
      const { branch } = req.body;

      const result = await requestScan(id, userId, branch);

      if (!result.success) {
        const statusCode =
          result.error?.code === 'PROTOCOL_NOT_FOUND'
            ? 404
            : result.error?.code === 'PROTOCOL_NOT_FUNDED'
            ? 402 // Payment Required
            : result.error?.code === 'PROTOCOL_NOT_ACTIVE'
            ? 400
            : 500;

        return res.status(statusCode).json({
          error: {
            code: result.error?.code || 'SCAN_REQUEST_FAILED',
            message: result.error?.message || 'Failed to request scan',
            requestId: req.id,
          },
        });
      }

      res.status(201).json({
        data: {
          scanId: result.scanId,
          message: 'Scan requested successfully',
        },
      });
    } catch (error) {
      console.error('Error requesting scan:', error);
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

/**
 * POST /api/v1/protocols/:id/record-funding
 * Record a funding transaction hash from frontend
 */
router.post(
  '/:id/record-funding',
  requireAuth,
  dashboardRateLimits.protocols,
  validateRequest({
    params: protocolIdSchema,
    body: recordFundingSchema,
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
      const { txHash } = req.body;

      const result = await recordFundingTransaction(id, userId, txHash);

      if (!result.success) {
        return res.status(404).json({
          error: {
            code: 'PROTOCOL_NOT_FOUND',
            message: result.error || 'Protocol not found',
            requestId: req.id,
          },
        });
      }

      res.status(200).json({
        data: {
          message: 'Funding transaction recorded',
          txHash,
        },
      });
    } catch (error) {
      console.error('Error recording funding:', error);
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

/**
 * GET /api/v1/protocols/:id/funding-status
 * Get current funding status for a protocol
 */
router.get(
  '/:id/funding-status',
  requireAuth,
  dashboardRateLimits.protocols,
  validateRequest({ params: protocolIdSchema }),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const status = await getProtocolFundingStatus(id, userId);

      if (!status) {
        return res.status(404).json({
          error: {
            code: 'PROTOCOL_NOT_FOUND',
            message: 'Protocol not found or access denied',
            requestId: req.id,
          },
        });
      }

      res.status(200).json({
        data: status,
      });
    } catch (error) {
      console.error('Error fetching funding status:', error);
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
