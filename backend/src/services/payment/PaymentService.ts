import { injectable, inject } from 'tsyringe';
import { TOKENS } from '../../di/tokens.js';
import type { ILogger } from '../../di/interfaces/ILogger.js';
import type { IBountyPoolClient } from '../../di/interfaces/IBlockchainClient.js';
import type { PrismaClient, Prisma, Severity, PaymentStatus } from '@prisma/client';
import type {
  PaymentListQuery,
} from '../../schemas/payment.schema.js';
import { ValidationRegistryClient } from '../../blockchain/contracts/ValidationRegistryClient.js';
import { BountySeverity } from '../../blockchain/contracts/BountyPoolClient.js';
import { ValidationError } from '../../errors/CustomError.js';
import type {
  PaymentWithDetails,
  PaginatedPayments,
  PaymentFilters,
  ResearcherEarnings,
  PaymentListResult,
} from './types.js';
import {
  PaymentNotFoundError,
  ValidationNotFoundError,
  InsufficientFundsError,
} from './types.js';

/**
 * Map Prisma Severity enum to BountySeverity enum
 */
function mapSeverityToBountySeverity(severity: Severity): BountySeverity {
  const mapping: Record<Severity, BountySeverity> = {
    CRITICAL: BountySeverity.CRITICAL,
    HIGH: BountySeverity.HIGH,
    MEDIUM: BountySeverity.MEDIUM,
    LOW: BountySeverity.LOW,
    INFO: BountySeverity.INFORMATIONAL,
  };
  return mapping[severity];
}

/**
 * Core payment CRUD operations.
 */
@injectable()
export class PaymentService {
  private logger: ILogger;

  constructor(
    @inject(TOKENS.Logger) logger: ILogger,
    @inject(TOKENS.Database) private prisma: PrismaClient,
    @inject(TOKENS.BountyPoolClient) private bountyPoolClient: IBountyPoolClient,
  ) {
    this.logger = logger.child({ service: 'PaymentService' });
  }

  /**
   * Create a Payment record from a validation ID.
   * Fetches validation data from the blockchain and creates a payment record.
   */
  async createPaymentFromValidation(
    validationId: string,
  ): Promise<PaymentWithDetails> {
    try {
      // Fetch validation from blockchain
      const validationClient = new ValidationRegistryClient();
      const validation = await validationClient.getValidation(validationId);

      if (!validation.exists) {
        throw new ValidationNotFoundError(validationId);
      }

      // Only create payments for CONFIRMED validations
      if (validation.outcome !== 0) {
        // 0 = CONFIRMED
        throw new ValidationError(
          `Cannot create payment for non-confirmed validation. Outcome: ${validation.outcome}`,
        );
      }

      // Find the proof record with this validation ID to get vulnerability
      const proof = await this.prisma.proof.findFirst({
        where: { onChainValidationId: validationId },
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

      if (!proof || !proof.finding) {
        throw new ValidationError(
          `No finding associated with validation ${validationId}`,
        );
      }

      const protocolId = proof.finding.scan.protocolId;

      // Find or create vulnerability record
      let vulnerability = await this.prisma.vulnerability.findFirst({
        where: {
          protocolId,
          vulnerabilityHash: validation.proofHash,
        },
      });

      if (!vulnerability) {
        // Create vulnerability from finding
        vulnerability = await this.prisma.vulnerability.create({
          data: {
            protocolId,
            vulnerabilityHash: validation.proofHash,
            severity: proof.finding.severity,
            status: 'ACKNOWLEDGED',
            proof: proof.encryptedPayload,
          },
        });
      }

      // Calculate bounty amount based on severity
      const amount = await this.bountyPoolClient.calculateBountyAmount(
        mapSeverityToBountySeverity(vulnerability.severity),
      );

      // Check if payment already exists for this validation
      const existingPayment = await this.prisma.payment.findFirst({
        where: {
          vulnerabilityId: vulnerability.id,
          researcherAddress: validation.validatorAgent,
        },
      });

      if (existingPayment) {
        return this.getPaymentById(existingPayment.id);
      }

      // Create payment record
      const payment = await this.prisma.payment.create({
        data: {
          vulnerabilityId: vulnerability.id,
          amount,
          currency: 'USDC',
          status: 'PENDING',
          researcherAddress: validation.validatorAgent,
          queuedAt: new Date(),
        },
        include: {
          vulnerability: true,
        },
      });

      // Update vulnerability bounty amount
      await this.prisma.vulnerability.update({
        where: { id: vulnerability.id },
        data: { bounty: amount },
      });

      return this.formatPaymentWithDetails(payment, validationId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Error creating payment from validation', {
        validationId,
        error: msg,
      });
      throw error;
    }
  }

  /**
   * Process a payment by executing blockchain transaction via BountyPoolClient.
   */
  async processPayment(paymentId: string): Promise<PaymentWithDetails> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { vulnerability: { include: { protocol: true } } },
      });

      if (!payment) {
        throw new PaymentNotFoundError(paymentId);
      }

      if (payment.status === 'COMPLETED') {
        throw new ValidationError(`Payment ${paymentId} has already been completed`);
      }

      // Find the validation ID from proof
      const proof = await this.prisma.proof.findFirst({
        where: {
          finding: {
            scan: {
              protocolId: payment.vulnerability.protocolId,
            },
          },
          status: 'VALIDATED',
        },
        orderBy: { validatedAt: 'desc' },
      });

      if (!proof?.onChainValidationId) {
        throw new ValidationError('No validated proof found for payment');
      }

      // Get protocol's on-chain ID
      const protocol = payment.vulnerability.protocol;
      if (!protocol.onChainProtocolId) {
        throw new ValidationError(
          `Protocol ${protocol.id} is not registered on-chain`,
        );
      }

      // Check if protocol has sufficient funds
      const protocolBalance = await this.bountyPoolClient.getProtocolBalance(
        protocol.onChainProtocolId,
      );

      if (protocolBalance < payment.amount) {
        throw new InsufficientFundsError(payment.amount, protocolBalance);
      }

      // Execute payment on blockchain
      const result = await this.bountyPoolClient.releaseBounty(
        protocol.onChainProtocolId,
        proof.onChainValidationId,
        payment.researcherAddress,
        mapSeverityToBountySeverity(payment.vulnerability.severity),
      );

      // Update payment record with transaction details
      const updatedPayment = await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'COMPLETED',
          txHash: result.txHash,
          onChainBountyId: result.bountyId,
          paidAt: new Date(result.timestamp * 1000),
          reconciled: true,
          reconciledAt: new Date(),
        },
        include: { vulnerability: true },
      });

      // Update protocol balances
      await this.prisma.protocol.update({
        where: { id: protocol.id },
        data: {
          availableBounty: { decrement: payment.amount },
          paidBounty: { increment: payment.amount },
        },
      });

      // Create funding event record
      await this.prisma.fundingEvent.create({
        data: {
          protocolId: protocol.id,
          amount: payment.amount,
          txHash: result.txHash,
          status: 'CONFIRMED',
          changeType: 'PAYMENT_RELEASED',
          confirmedAt: new Date(),
        },
      });

      // Create audit log
      await this.prisma.auditLog.create({
        data: {
          protocolId: protocol.id,
          action: 'PAYMENT_RELEASED',
          txHash: result.txHash,
          metadata: {
            paymentId,
            amount: payment.amount,
            researcherAddress: payment.researcherAddress,
            bountyId: result.bountyId,
          },
        },
      });

      return this.formatPaymentWithDetails(updatedPayment, proof.onChainValidationId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Error processing payment', {
        paymentId,
        error: msg,
      });

      // Update payment with failure information
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'FAILED',
          failureReason: msg,
          retryCount: { increment: 1 },
        },
      });

      throw error;
    }
  }

  /**
   * Get payment by ID with nested validation and vulnerability data.
   */
  async getPaymentById(paymentId: string): Promise<PaymentWithDetails> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { vulnerability: true },
    });

    if (!payment) {
      throw new PaymentNotFoundError(paymentId);
    }

    // Find associated validation
    const proof = await this.prisma.proof.findFirst({
      where: {
        finding: {
          scan: {
            protocolId: payment.vulnerability.protocolId,
          },
        },
        status: 'VALIDATED',
      },
      orderBy: { validatedAt: 'desc' },
    });

    const validationId = proof?.onChainValidationId || null;

    return this.formatPaymentWithDetails(payment, validationId);
  }

  /**
   * Get paginated payments by protocol with filters.
   */
  async getPaymentsByProtocol(
    protocolId: string,
    filters: PaymentFilters = {},
  ): Promise<PaginatedPayments> {
    const { status, startDate, endDate, page = 1, limit = 20 } = filters;

    // Build where clause
    const where: Prisma.PaymentWhereInput = {
      vulnerability: { protocolId },
    };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      const paidAt: Prisma.DateTimeNullableFilter = {};
      if (startDate) paidAt.gte = startDate;
      if (endDate) paidAt.lte = endDate;
      where.paidAt = paidAt;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch payments and total count in parallel
    const [payments, totalCount] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: { vulnerability: true },
        orderBy: { paidAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    // Format payments with validation data
    const formattedPayments = await Promise.all(
      payments.map(async (payment) => {
        const proof = await this.prisma.proof.findFirst({
          where: {
            finding: {
              scan: { protocolId: payment.vulnerability.protocolId },
            },
            status: 'VALIDATED',
          },
          orderBy: { validatedAt: 'desc' },
        });

        return this.formatPaymentWithDetails(payment, proof?.onChainValidationId || null);
      }),
    );

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: formattedPayments,
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Get researcher earnings with payment history.
   */
  async getPaymentsByResearcher(
    address: string,
    filters: { startDate?: Date; endDate?: Date } = {},
  ): Promise<ResearcherEarnings> {
    const { startDate, endDate } = filters;

    // Build where clause
    const where: Prisma.PaymentWhereInput = {
      researcherAddress: address,
    };

    if (startDate || endDate) {
      const paidAt: Prisma.DateTimeNullableFilter = {};
      if (startDate) paidAt.gte = startDate;
      if (endDate) paidAt.lte = endDate;
      where.paidAt = paidAt;
    }

    // Fetch all payments for researcher
    const payments = await this.prisma.payment.findMany({
      where,
      include: { vulnerability: true },
      orderBy: { paidAt: 'desc' },
    });

    // Calculate total earnings (only COMPLETED payments)
    const totalEarnings = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);

    // Count payments by severity
    const paymentCountBySeverity = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };

    payments.forEach((payment) => {
      if (payment.status === 'COMPLETED') {
        paymentCountBySeverity[payment.vulnerability.severity]++;
      }
    });

    // Format payments with validation data
    const formattedPayments = await Promise.all(
      payments.map(async (payment) => {
        const proof = await this.prisma.proof.findFirst({
          where: {
            finding: {
              scan: { protocolId: payment.vulnerability.protocolId },
            },
            status: 'VALIDATED',
          },
          orderBy: { validatedAt: 'desc' },
        });

        return this.formatPaymentWithDetails(payment, proof?.onChainValidationId || null);
      }),
    );

    return {
      researcherAddress: address,
      totalEarnings,
      payments: formattedPayments,
      paymentCountBySeverity,
    };
  }

  /**
   * Get paginated and filtered payment list.
   */
  async getPaymentList(
    filters: Partial<PaymentListQuery>,
  ): Promise<PaymentListResult> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      const where: Prisma.PaymentWhereInput = {};

      if (filters.protocolId) {
        where.vulnerability = {
          protocolId: filters.protocolId,
          ...(filters.severity ? { severity: filters.severity } : {}),
        };
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.startDate || filters.endDate) {
        const paidAt: Prisma.DateTimeNullableFilter = {};
        if (filters.startDate) {
          paidAt.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          paidAt.lte = new Date(filters.endDate);
        }
        where.paidAt = paidAt;
      }

      const [payments, totalCount] = await Promise.all([
        this.prisma.payment.findMany({
          where,
          include: {
            vulnerability: {
              select: {
                id: true,
                severity: true,
                status: true,
                vulnerabilityHash: true,
                protocolId: true,
                discoveredAt: true,
                protocol: {
                  select: {
                    id: true,
                    githubUrl: true,
                    contractName: true,
                  },
                },
              },
            },
          },
          orderBy: { paidAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.payment.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        success: true,
        payments: payments.map((p) => ({
          id: p.id,
          vulnerabilityId: p.vulnerabilityId,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          txHash: p.txHash,
          researcherAddress: p.researcherAddress,
          createdAt:
            p.queuedAt?.toISOString() ||
            p.paidAt?.toISOString() ||
            p.vulnerability.discoveredAt.toISOString(),
          paidAt: p.paidAt?.toISOString() || null,
          queuedAt: p.queuedAt?.toISOString() || null,
          reconciled: p.reconciled,
          failureReason: p.failureReason,
          retryCount: p.retryCount,
          protocol: p.vulnerability.protocol
            ? {
                id: p.vulnerability.protocol.id,
                name:
                  p.vulnerability.protocol.contractName ||
                  p.vulnerability.protocol.githubUrl.split('/').pop() ||
                  'Unknown',
              }
            : null,
          vulnerability: {
            id: p.vulnerability.id,
            severity: p.vulnerability.severity,
            status: p.vulnerability.status,
            vulnerabilityHash: p.vulnerability.vulnerabilityHash,
            protocolId: p.vulnerability.protocolId,
            discoveredAt: p.vulnerability.discoveredAt,
          },
        })),
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Error fetching payment list', { error: msg });
      return {
        success: false,
        error: {
          code: 'PAYMENT_LIST_ERROR',
          message: msg || 'Failed to fetch payment list',
        },
      };
    }
  }

  /**
   * Helper to format payment with validation details.
   */
  private async formatPaymentWithDetails(
    payment: { id: string; vulnerabilityId: string; amount: number; currency: string; status: PaymentStatus; txHash: string | null; onChainBountyId: string | null; researcherAddress: string; paidAt: Date | null; reconciled: boolean; reconciledAt: Date | null; failureReason: string | null; retryCount: number; queuedAt: Date | null; vulnerability: { id: string; vulnerabilityHash: string; severity: Severity; status: string; discoveredAt: Date; protocolId: string } },
    validationId: string | null,
  ): Promise<PaymentWithDetails> {
    let validation: PaymentWithDetails['validation'] | undefined;

    if (validationId) {
      try {
        const validationClient = new ValidationRegistryClient();
        const onChainValidation = await validationClient.getValidation(validationId);

        if (onChainValidation.exists) {
          validation = {
            validationId: onChainValidation.validationId,
            outcome: onChainValidation.outcome,
            severity: onChainValidation.severity,
            vulnerabilityType: onChainValidation.vulnerabilityType,
            timestamp: new Date(Number(onChainValidation.timestamp) * 1000).toISOString(),
          };
        }
      } catch (error) {
        const valMsg = error instanceof Error ? error.message : String(error);
        this.logger.error('Error fetching validation', {
          validationId,
          error: valMsg,
        });
        // Continue without validation data
      }
    }

    return {
      id: payment.id,
      vulnerabilityId: payment.vulnerabilityId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      txHash: payment.txHash,
      onChainBountyId: payment.onChainBountyId,
      researcherAddress: payment.researcherAddress,
      paidAt: payment.paidAt?.toISOString() || null,
      reconciled: payment.reconciled,
      reconciledAt: payment.reconciledAt?.toISOString() || null,
      failureReason: payment.failureReason,
      retryCount: payment.retryCount,
      queuedAt: payment.queuedAt?.toISOString() || null,
      validation,
      vulnerability: {
        id: payment.vulnerability.id,
        vulnerabilityHash: payment.vulnerability.vulnerabilityHash,
        severity: payment.vulnerability.severity,
        status: payment.vulnerability.status,
        discoveredAt: payment.vulnerability.discoveredAt.toISOString(),
        protocolId: payment.vulnerability.protocolId,
      },
    };
  }
}
