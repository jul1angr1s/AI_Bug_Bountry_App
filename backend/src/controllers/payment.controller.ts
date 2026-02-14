import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../lib/prisma.js';
import { addPaymentJob } from '../queues/payment.queue.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('PaymentController');
const prisma = getPrismaClient();

/**
 * GET /api/v1/payments
 * List all payments with filters and pagination
 */
export async function listPayments(req: Request, res: Response): Promise<void> {
  try {
    const {
      protocolId,
      researcherAddress,
      status,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const where: Prisma.PaymentWhereInput = {};
    if (protocolId) {
      where.vulnerability = {
        protocolId: protocolId as string,
      };
    }
    if (researcherAddress) {
      where.researcherAddress = researcherAddress as string;
    }
    if (status) {
      where.status = status as string;
    }

    // Query payments
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          vulnerability: {
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
        orderBy: { queuedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      payments: payments.map((p) => ({
        id: p.id,
        findingId: p.vulnerabilityId,
        findingTitle: 'Vulnerability', // See GitHub Issue #102
        protocolName: p.vulnerability.protocol?.githubUrl.split('/').pop() || 'Unknown',
        researcherAddress: p.researcherAddress,
        amount: p.amount.toString(),
        currency: p.currency,
        status: p.status,
        txHash: p.txHash,
        paidAt: p.paidAt?.toISOString(),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    log.error({ err: error }, 'listPayments error');
    res.status(500).json({ error: 'Failed to list payments' });
  }
}

/**
 * GET /api/v1/payments/:id
 * Get payment details
 */
export async function getPayment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        vulnerability: {
          include: {
            protocol: true,
          },
        },
        reconciliations: true,
      },
    });

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    res.json({
      id: payment.id,
      findingId: payment.vulnerabilityId,
      researcherAddress: payment.researcherAddress,
      amount: payment.amount.toString(),
      currency: payment.currency,
      status: payment.status,
      txHash: payment.txHash,
      onChainBountyId: payment.onChainBountyId,
      queuedAt: payment.queuedAt?.toISOString(),
      paidAt: payment.paidAt?.toISOString(),
      reconciled: payment.reconciled,
      reconciledAt: payment.reconciledAt?.toISOString(),
      failureReason: payment.failureReason,
      retryCount: payment.retryCount,
      protocol: payment.vulnerability.protocol,
      reconciliations: payment.reconciliations,
    });
  } catch (error) {
    log.error({ err: error }, 'getPayment error');
    res.status(500).json({ error: 'Failed to get payment' });
  }
}

/**
 * GET /api/v1/payments/researcher/:address
 * Get payments by researcher address
 */
export async function getResearcherPayments(req: Request, res: Response): Promise<void> {
  try {
    const { address } = req.params;
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { researcherAddress: address },
        include: {
          vulnerability: {
            include: {
              protocol: true,
            },
          },
        },
        orderBy: { queuedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.payment.count({ where: { researcherAddress: address } }),
    ]);

    res.json({
      researcherAddress: address,
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount.toString(),
        currency: p.currency,
        status: p.status,
        txHash: p.txHash,
        paidAt: p.paidAt?.toISOString(),
        protocolName: p.vulnerability.protocol?.githubUrl.split('/').pop() || 'Unknown',
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    log.error({ err: error }, 'getResearcherPayments error');
    res.status(500).json({ error: 'Failed to get researcher payments' });
  }
}

/**
 * POST /api/v1/payments/:id/retry
 * Manually retry a failed payment (admin only)
 */
export async function retryPayment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // See GitHub Issue #103
    // if (!req.user?.isAdmin) {
    //   res.status(403).json({ error: 'Forbidden: Admin access required' });
    //   return;
    // }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        vulnerability: {
          include: {
            protocol: true,
          },
        },
      },
    });

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    if (payment.status === 'COMPLETED') {
      res.status(400).json({ error: 'Payment already completed' });
      return;
    }

    // Reset status and queue for retry
    await prisma.payment.update({
      where: { id },
      data: {
        status: 'PENDING',
        failureReason: null,
      },
    });

    // Re-queue payment job
    await addPaymentJob({
      paymentId: payment.id,
      validationId: payment.vulnerabilityId,
      protocolId: payment.vulnerability.protocolId,
    });

    res.json({
      success: true,
      message: 'Payment queued for retry',
      paymentId: id,
    });
  } catch (error) {
    log.error({ err: error }, 'retryPayment error');
    res.status(500).json({ error: 'Failed to retry payment' });
  }
}

/**
 * GET /api/v1/payments/stats
 * Get payment statistics
 */
export async function getPaymentStats(req: Request, res: Response): Promise<void> {
  try {
    const [total, completed, pending, failed, totalAmount] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { status: 'COMPLETED' } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({ where: { status: 'FAILED' } }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      total,
      completed,
      pending,
      failed,
      totalAmountPaid: totalAmount._sum.amount?.toString() || '0',
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  } catch (error) {
    log.error({ err: error }, 'getPaymentStats error');
    res.status(500).json({ error: 'Failed to get payment stats' });
  }
}
