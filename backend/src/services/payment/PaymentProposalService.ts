import { injectable, inject } from 'tsyringe';
import { TOKENS } from '../../di/tokens.js';
import type { ILogger } from '../../di/interfaces/ILogger.js';
import type { IBountyPoolClient } from '../../di/interfaces/IBlockchainClient.js';
import type { PrismaClient } from '@prisma/client';
import type { PoolStatusResult } from './types.js';
import { fromUSDCMicro, toMoneyNumber, toUSDCMicro } from '../../lib/money.js';

/**
 * Pool status inspection and manual payment proposal operations.
 */
@injectable()
export class PaymentProposalService {
  private logger: ILogger;

  constructor(
    @inject(TOKENS.Logger) logger: ILogger,
    @inject(TOKENS.Database) private prisma: PrismaClient,
    @inject(TOKENS.BountyPoolClient) private bountyPoolClient: IBountyPoolClient,
  ) {
    this.logger = logger.child({ service: 'PaymentProposalService' });
  }

  /**
   * Get the current pool status for a protocol, including on-chain balance,
   * pending payments, and recent transactions.
   */
  async getPoolStatus(protocolId: string): Promise<PoolStatusResult> {
    try {
      const protocol = await this.prisma.protocol.findUnique({
        where: { id: protocolId },
        select: {
          id: true,
          totalBountyPool: true,
          availableBounty: true,
          paidBounty: true,
        },
      });

      if (!protocol) {
        return {
          success: false,
          error: {
            code: 'PROTOCOL_NOT_FOUND',
            message: 'Protocol not found',
          },
        };
      }

      let availableBalance = '0';
      let availableBalanceFormatted = '0';

      try {
        // For now, use database balance since we need protocolId for on-chain query
        // See GitHub Issue #104
        availableBalance = protocol.availableBounty.toString();
        availableBalanceFormatted = protocol.availableBounty.toString();
      } catch (error) {
        const balanceMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn('Failed to get on-chain balance', {
          protocolId,
          error: balanceMsg,
        });
        availableBalance = protocol.availableBounty.toString();
        availableBalanceFormatted = protocol.availableBounty.toString();
      }

      const pendingPayments = await this.prisma.payment.aggregate({
        where: {
          vulnerability: { protocolId },
          status: 'PENDING',
        },
        _sum: { amount: true },
        _count: { id: true },
      });

      const pendingPaymentsTotal = toMoneyNumber(pendingPayments._sum.amount || 0);
      const pendingPaymentsCount = pendingPayments._count.id;
      const remainingBalance = fromUSDCMicro(
        toUSDCMicro(protocol.availableBounty) - toUSDCMicro(pendingPaymentsTotal)
      );

      const [fundingEvents, recentPayments] = await Promise.all([
        this.prisma.fundingEvent.findMany({
          where: { protocolId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        this.prisma.payment.findMany({
          where: {
            vulnerability: { protocolId },
            status: 'COMPLETED',
          },
          orderBy: { paidAt: 'desc' },
          take: 5,
        }),
      ]);

      const recentTransactions = [
        ...fundingEvents.map((fe) => ({
          type: 'DEPOSIT',
          amount: toMoneyNumber(fe.amount),
          txHash: fe.txHash,
          timestamp: fe.createdAt.toISOString(),
        })),
        ...recentPayments.map((p) => ({
          type: 'PAYMENT',
          amount: toMoneyNumber(p.amount),
          txHash: p.txHash || '',
          timestamp: p.paidAt?.toISOString() || '',
        })),
      ]
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 10);

      return {
        success: true,
        poolStatus: {
          protocolId,
          availableBalance,
          availableBalanceFormatted,
          totalDeposited: toMoneyNumber(protocol.totalBountyPool),
          totalPaid: toMoneyNumber(protocol.paidBounty),
          remainingBalance,
          pendingPaymentsCount,
          pendingPaymentsTotal,
          recentTransactions,
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Error fetching pool status', {
        protocolId,
        error: msg,
      });
      return {
        success: false,
        error: {
          code: 'POOL_STATUS_ERROR',
          message: msg || 'Failed to fetch pool status',
        },
      };
    }
  }

  /**
   * Propose a manual payment for a researcher.
   * Creates a payment proposal that can be reviewed by admins and queues it
   * for on-chain execution.
   */
  async proposeManualPayment(data: {
    protocolId: string;
    recipientAddress: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    justification: string;
    proposedBy: string;
  }): Promise<{
    success: boolean;
    proposal?: {
      id: string;
      vulnerabilityId: string;
      protocolId: string;
      recipientAddress: string;
      severity: string;
      amount: number;
      justification: string;
      proposedBy: string;
      status: string;
      createdAt: string | Date;
    };
    error?: { code: string; message: string };
  }> {
    try {
      // Validate protocol exists
      const protocol = await this.prisma.protocol.findUnique({
        where: { id: data.protocolId },
      });

      if (!protocol) {
        return {
          success: false,
          error: {
            code: 'PROTOCOL_NOT_FOUND',
            message: `Protocol ${data.protocolId} not found`,
          },
        };
      }

      // Calculate amount based on severity
      const severityMap: Record<string, number> = {
        HIGH: 5,
        MEDIUM: 3,
        LOW: 1,
      };
      const amount = severityMap[data.severity];

      // Check if protocol has sufficient balance
      const availableBounty = toMoneyNumber(protocol.availableBounty || protocol.totalBountyPool);
      if (toUSDCMicro(availableBounty) < toUSDCMicro(amount)) {
        return {
          success: false,
          error: {
            code: 'INSUFFICIENT_BALANCE',
            message: `Insufficient pool balance. Required: ${amount} USDC, Available: ${availableBounty} USDC`,
          },
        };
      }

      // Create vulnerability and payment records in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create a vulnerability record for the manual submission
        const vulnerability = await tx.vulnerability.create({
          data: {
            protocolId: data.protocolId,
            vulnerabilityHash: `manual-${Date.now()}-${data.recipientAddress.slice(0, 8)}`,
            severity: data.severity,
            status: 'ACKNOWLEDGED',
            bounty: amount,
            proof: `Manual Payment Proposal\n\nJustification: ${data.justification}\n\nProposed by: ${data.proposedBy}`,
          },
        });

        // Create the payment record
        const payment = await tx.payment.create({
          data: {
            vulnerabilityId: vulnerability.id,
            amount,
            currency: 'USDC',
            status: 'PENDING',
            researcherAddress: data.recipientAddress,
          },
        });

        // Update protocol's available bounty
        await tx.protocol.update({
          where: { id: data.protocolId },
          data: {
            availableBounty: {
              decrement: amount,
            },
          },
        });

        return { vulnerability, payment };
      });

      this.logger.info('Manual payment created', {
        vulnerabilityId: result.vulnerability.id,
        paymentId: result.payment.id,
        amount,
        recipientAddress: data.recipientAddress,
      });

      // Queue the payment for on-chain execution
      const { addPaymentJob } = await import('../../queues/payment.queue.js');
      const { ethers } = await import('ethers');
      const validationId = ethers.id(`manual-${result.payment.id}`);

      await addPaymentJob({
        paymentId: result.payment.id,
        validationId,
        protocolId: data.protocolId,
      });

      this.logger.info('Manual payment queued for on-chain execution', {
        paymentId: result.payment.id,
      });

      return {
        success: true,
        proposal: {
          id: result.payment.id,
          vulnerabilityId: result.vulnerability.id,
          protocolId: data.protocolId,
          recipientAddress: data.recipientAddress,
          severity: data.severity,
          amount,
          justification: data.justification,
          proposedBy: data.proposedBy,
          status: result.payment.status,
          createdAt: result.payment.queuedAt || new Date().toISOString(),
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Error proposing manual payment', {
        protocolId: data.protocolId,
        recipientAddress: data.recipientAddress,
        error: msg,
      });
      return {
        success: false,
        error: {
          code: 'PROPOSAL_ERROR',
          message: msg || 'Failed to create payment proposal',
        },
      };
    }
  }
}
