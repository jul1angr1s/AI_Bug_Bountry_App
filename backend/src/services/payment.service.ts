import { getPrismaClient } from '../lib/prisma.js';
import { createLogger } from '../lib/logger.js';
import { BountyPoolClient, BountySeverity } from '../blockchain/contracts/BountyPoolClient.js';
import { ValidationRegistryClient } from '../blockchain/contracts/ValidationRegistryClient.js';
import USDCClient from '../blockchain/contracts/USDCClient.js';
import { NotFoundError, ValidationError } from '../errors/CustomError.js';
import { fromUSDCMicro, sumMoney, toMoneyNumber, toUSDCMicro } from '../lib/money.js';
import type { PaymentStatus, Severity } from '@prisma/client';
import type {
  PaymentListQuery,
  ResearcherEarningsQuery,
  PaymentStatsQuery,
  LeaderboardQuery,
} from '../schemas/payment.schema.js';

const log = createLogger('PaymentService');
const prisma = getPrismaClient();
const usdcClient = new USDCClient();

// Custom error classes
export class PaymentNotFoundError extends NotFoundError {
  constructor(paymentId: string) {
    super('Payment', paymentId);
  }
}

export class ValidationNotFoundError extends NotFoundError {
  constructor(validationId: string) {
    super('Validation', validationId);
  }
}

export class VulnerabilityNotFoundError extends NotFoundError {
  constructor(vulnerabilityId: string) {
    super('Vulnerability', vulnerabilityId);
  }
}

export class InsufficientFundsError extends ValidationError {
  constructor(required: number, available: number) {
    super(`Insufficient funds. Required: ${required} USDC, Available: ${available} USDC`);
  }
}

// Interfaces
export interface PaymentWithDetails {
  id: string;
  vulnerabilityId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  txHash: string | null;
  onChainBountyId: string | null;
  researcherAddress: string;
  paidAt: string | null;
  reconciled: boolean;
  reconciledAt: string | null;
  failureReason: string | null;
  retryCount: number;
  queuedAt: string | null;
  validation?: {
    validationId: string;
    outcome: number;
    severity: number;
    vulnerabilityType: string;
    timestamp: string;
  };
  vulnerability: {
    id: string;
    vulnerabilityHash: string;
    severity: Severity;
    status: string;
    discoveredAt: string;
    protocolId: string;
  };
}

export interface PaginationMetadata {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedPayments {
  data: PaymentWithDetails[];
  pagination: PaginationMetadata;
}

export interface PaymentFilters {
  status?: PaymentStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface ResearcherEarnings {
  researcherAddress: string;
  totalEarnings: number;
  payments: PaymentWithDetails[];
  paymentCountBySeverity: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    INFO: number;
  };
}

export interface PaymentStatistics {
  totalPayments: number;
  totalAmountPaid: number;
  averagePaymentAmount: number;
  paymentsByStatus: {
    PENDING: number;
    COMPLETED: number;
    FAILED: number;
  };
  timeSeries?: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
}

export interface StatsFilters {
  protocolId?: string;
  groupBy?: 'day' | 'week' | 'month';
  days?: number;
}

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
 * Create a Payment record from a validation ID
 * This function fetches validation data from the blockchain and creates a payment record
 */
export async function createPaymentFromValidation(
  validationId: string
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
        `Cannot create payment for non-confirmed validation. Outcome: ${validation.outcome}`
      );
    }

    // Find the proof record with this validation ID to get vulnerability
    const proof = await prisma.proof.findFirst({
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
        `No finding associated with validation ${validationId}`
      );
    }

    const protocolId = proof.finding.scan.protocolId;

    // Find or create vulnerability record
    let vulnerability = await prisma.vulnerability.findFirst({
      where: {
        protocolId,
        vulnerabilityHash: validation.proofHash,
      },
    });

    if (!vulnerability) {
      // Create vulnerability from finding
      vulnerability = await prisma.vulnerability.create({
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
    const bountyClient = new BountyPoolClient();
    const amount = await bountyClient.calculateBountyAmount(
      mapSeverityToBountySeverity(vulnerability.severity)
    );

    // Check if payment already exists for this validation
    const existingPayment = await prisma.payment.findFirst({
      where: {
        vulnerabilityId: vulnerability.id,
        researcherAddress: validation.validatorAgent, // Note: This is actually the researcher address
      },
    });

    if (existingPayment) {
      return getPaymentById(existingPayment.id);
    }

    // Create payment record
    const payment = await prisma.payment.create({
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
    await prisma.vulnerability.update({
      where: { id: vulnerability.id },
      data: { bounty: amount },
    });

    return formatPaymentWithDetails(payment, validationId);
  } catch (error: any) {
    log.error({ err: error }, 'Error creating payment from validation');
    throw error;
  }
}

/**
 * Process a payment by executing blockchain transaction via BountyPoolClient
 */
export async function processPayment(paymentId: string): Promise<PaymentWithDetails> {
  try {
    const payment = await prisma.payment.findUnique({
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
    const proof = await prisma.proof.findFirst({
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
        `Protocol ${protocol.id} is not registered on-chain`
      );
    }

    // Check if protocol has sufficient funds
    const bountyClient = new BountyPoolClient();
    const protocolBalance = await bountyClient.getProtocolBalance(
      protocol.onChainProtocolId
    );

    const paymentAmount = toMoneyNumber(payment.amount);
    if (toUSDCMicro(protocolBalance) < toUSDCMicro(paymentAmount)) {
      throw new InsufficientFundsError(paymentAmount, protocolBalance);
    }

    // Execute payment on blockchain
    const result = await bountyClient.releaseBounty(
      protocol.onChainProtocolId,
      proof.onChainValidationId,
      payment.researcherAddress,
      mapSeverityToBountySeverity(payment.vulnerability.severity)
    );

    // Update payment record with transaction details
    const updatedPayment = await prisma.payment.update({
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
    await prisma.protocol.update({
      where: { id: protocol.id },
      data: {
        availableBounty: { decrement: payment.amount },
        paidBounty: { increment: payment.amount },
      },
    });

    // Create funding event record
    await prisma.fundingEvent.create({
      data: {
        protocolId: protocol.id,
        amount: toMoneyNumber(payment.amount),
        txHash: result.txHash,
        status: 'CONFIRMED',
        changeType: 'PAYMENT_RELEASED',
        confirmedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        protocolId: protocol.id,
        action: 'PAYMENT_RELEASED',
        txHash: result.txHash,
        metadata: {
          paymentId,
          amount: toMoneyNumber(payment.amount),
          researcherAddress: payment.researcherAddress,
          bountyId: result.bountyId,
        },
      },
    });

    return formatPaymentWithDetails(updatedPayment, proof.onChainValidationId);
  } catch (error: any) {
    log.error({ err: error }, 'Error processing payment');

    // Update payment with failure information
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'FAILED',
        failureReason: error.message,
        retryCount: { increment: 1 },
      },
    });

    throw error;
  }
}

/**
 * Get payment by ID with nested validation and vulnerability data
 */
export async function getPaymentById(paymentId: string): Promise<PaymentWithDetails> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { vulnerability: true },
  });

  if (!payment) {
    throw new PaymentNotFoundError(paymentId);
  }

  // Find associated validation
  const proof = await prisma.proof.findFirst({
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

  return formatPaymentWithDetails(payment, validationId);
}

/**
 * Get paginated payments by protocol with filters
 */
export async function getPaymentsByProtocol(
  protocolId: string,
  filters: PaymentFilters = {}
): Promise<PaginatedPayments> {
  const { status, startDate, endDate, page = 1, limit = 20 } = filters;

  // Build where clause
  const where: any = {
    vulnerability: { protocolId },
  };

  if (status) {
    where.status = status;
  }

  if (startDate || endDate) {
    where.paidAt = {};
    if (startDate) where.paidAt.gte = startDate;
    if (endDate) where.paidAt.lte = endDate;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Fetch payments and total count in parallel
  const [payments, totalCount] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { vulnerability: true },
      orderBy: { paidAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  // Format payments with validation data
  const formattedPayments = await Promise.all(
    payments.map(async (payment) => {
      const proof = await prisma.proof.findFirst({
        where: {
          finding: {
            scan: { protocolId: payment.vulnerability.protocolId },
          },
          status: 'VALIDATED',
        },
        orderBy: { validatedAt: 'desc' },
      });

      return formatPaymentWithDetails(payment, proof?.onChainValidationId || null);
    })
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
 * Get researcher earnings with payment history
 */
export async function getPaymentsByResearcher(
  address: string,
  filters: { startDate?: Date; endDate?: Date } = {}
): Promise<ResearcherEarnings> {
  const { startDate, endDate } = filters;

  // Build where clause
  const where: any = {
    researcherAddress: address,
  };

  if (startDate || endDate) {
    where.paidAt = {};
    if (startDate) where.paidAt.gte = startDate;
    if (endDate) where.paidAt.lte = endDate;
  }

  // Fetch all payments for researcher
  const payments = await prisma.payment.findMany({
    where,
    include: { vulnerability: true },
    orderBy: { paidAt: 'desc' },
  });

  // Calculate total earnings (only COMPLETED payments)
  const totalEarnings = sumMoney(
    payments.filter((p) => p.status === 'COMPLETED').map((p) => p.amount)
  );

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
      const proof = await prisma.proof.findFirst({
        where: {
          finding: {
            scan: { protocolId: payment.vulnerability.protocolId },
          },
          status: 'VALIDATED',
        },
        orderBy: { validatedAt: 'desc' },
      });

      return formatPaymentWithDetails(payment, proof?.onChainValidationId || null);
    })
  );

  return {
    researcherAddress: address,
    totalEarnings,
    payments: formattedPayments,
    paymentCountBySeverity,
  };
}

/**
 * Get aggregated payment statistics
 */
export async function getPaymentStats(
  filters: StatsFilters = {}
): Promise<PaymentStatistics> {
  const { protocolId, groupBy, days = 30 } = filters;

  // Build where clause
  const where: any = {};

  if (protocolId) {
    where.vulnerability = { protocolId };
  }

  // Fetch all payments matching filters
  const payments = await prisma.payment.findMany({
    where,
    select: {
      amount: true,
      status: true,
      paidAt: true,
    },
  });

  // Calculate basic statistics
  const totalPayments = payments.length;
  const completedPayments = payments.filter((p) => p.status === 'COMPLETED');
  const totalAmountPaid = sumMoney(completedPayments.map((p) => p.amount));
  const averagePaymentAmount = completedPayments.length > 0
    ? fromUSDCMicro(toUSDCMicro(totalAmountPaid) / BigInt(completedPayments.length))
    : 0;

  // Count by status
  const paymentsByStatus = {
    PENDING: payments.filter((p) => p.status === 'PENDING').length,
    COMPLETED: completedPayments.length,
    FAILED: payments.filter((p) => p.status === 'FAILED').length,
  };

  const stats: PaymentStatistics = {
    totalPayments,
    totalAmountPaid,
    averagePaymentAmount,
    paymentsByStatus,
  };

  // Generate time series if requested
  if (groupBy === 'day') {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const timeSeriesMap = new Map<string, { count: number; amount: number }>();

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      timeSeriesMap.set(dateKey, { count: 0, amount: 0 });
    }

    // Populate with actual data
    completedPayments.forEach((payment) => {
      if (payment.paidAt) {
        const dateKey = payment.paidAt.toISOString().split('T')[0];
        const current = timeSeriesMap.get(dateKey);
        if (current) {
          current.count++;
          current.amount = sumMoney([current.amount, payment.amount]);
        }
      }
    });

    stats.timeSeries = Array.from(timeSeriesMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        amount: data.amount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  return stats;
}

/**
 * Helper function to format payment with validation details
 */
async function formatPaymentWithDetails(
  payment: any,
  validationId: string | null
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
      log.error({ err: error }, 'Error fetching validation');
      // Continue without validation data
    }
  }

  return {
    id: payment.id,
    vulnerabilityId: payment.vulnerabilityId,
    amount: toMoneyNumber(payment.amount),
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

// ========================================
// USDC API Service Functions (Tasks 8.2-8.4)
// ========================================

export interface UsdcAllowanceResult {
  success: boolean;
  allowance?: string;
  allowanceFormatted?: string;
  error?: { code: string; message: string };
}

export async function getUsdcAllowance(
  owner: string,
  spender: string
): Promise<UsdcAllowanceResult> {
  try {
    const allowance = await usdcClient.getAllowance(owner, spender);
    const allowanceFormatted = usdcClient.formatUSDC(allowance);

    return {
      success: true,
      allowance: allowance.toString(),
      allowanceFormatted,
    };
  } catch (error: any) {
    log.error({ err: error }, 'Error getting USDC allowance');
    return {
      success: false,
      error: {
        code: 'USDC_ALLOWANCE_ERROR',
        message: error.message || 'Failed to get USDC allowance',
      },
    };
  }
}

export interface UsdcBalanceResult {
  success: boolean;
  balance?: string;
  balanceFormatted?: string;
  error?: { code: string; message: string };
}

export async function getUsdcBalance(address: string): Promise<UsdcBalanceResult> {
  try {
    const balance = await usdcClient.getBalance(address);
    const balanceFormatted = usdcClient.formatUSDC(balance);

    return {
      success: true,
      balance: balance.toString(),
      balanceFormatted,
    };
  } catch (error: any) {
    log.error({ err: error }, 'Error getting USDC balance');
    return {
      success: false,
      error: {
        code: 'USDC_BALANCE_ERROR',
        message: error.message || 'Failed to get USDC balance',
      },
    };
  }
}

export interface ApprovalTransactionResult {
  success: boolean;
  transaction?: {
    to: string;
    data: string;
    value: string;
    chainId: number;
    gasLimit: string;
  };
  error?: { code: string; message: string };
}

export async function generateApprovalTransaction(
  amount: string,
  spender: string
): Promise<ApprovalTransactionResult> {
  try {
    const amountBigInt = usdcClient.parseUSDC(amount);

    if (amountBigInt <= BigInt(0)) {
      return {
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Amount must be greater than zero',
        },
      };
    }

    const txData = await usdcClient.generateApprovalTxData(spender, amountBigInt);

    return {
      success: true,
      transaction: {
        to: txData.to,
        data: txData.data,
        value: txData.value,
        chainId: txData.chainId,
        gasLimit: txData.gasLimit.toString(),
      },
    };
  } catch (error: any) {
    log.error({ err: error }, 'Error generating approval transaction');
    const code = error.message.includes('Invalid BountyPool address')
      ? 'INVALID_BOUNTY_POOL'
      : 'APPROVAL_TX_ERROR';

    return {
      success: false,
      error: {
        code,
        message: error.message || 'Failed to generate approval transaction',
      },
    };
  }
}

// ========================================
// Payment List/Details API Functions (Tasks 8.5-8.7)
// ========================================

export interface PaymentListResult {
  success: boolean;
  payments?: any[];
  pagination?: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  error?: { code: string; message: string };
}

export async function getPaymentList(
  filters: Partial<PaymentListQuery>
): Promise<PaymentListResult> {
  try {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

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
      where.paidAt = {};
      if (filters.startDate) {
        where.paidAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.paidAt.lte = new Date(filters.endDate);
      }
    }

    const [payments, totalCount] = await Promise.all([
      prisma.payment.findMany({
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
      prisma.payment.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      payments: payments.map((p) => ({
        id: p.id,
        vulnerabilityId: p.vulnerabilityId,
        amount: toMoneyNumber(p.amount),
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
  } catch (error: any) {
    log.error({ err: error }, 'Error fetching payment list');
    return {
      success: false,
      error: {
        code: 'PAYMENT_LIST_ERROR',
        message: error.message || 'Failed to fetch payment list',
      },
    };
  }
}

export interface ResearcherEarningsResult {
  success: boolean;
  data?: {
    researcherAddress: string;
    totalEarnings: number;
    paymentCount: number;
    paymentsBySeverity: {
      CRITICAL: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
      INFO: number;
    };
    payments: any[];
  };
  error?: { code: string; message: string };
}

export async function getResearcherEarnings(
  address: string,
  filters: Partial<ResearcherEarningsQuery>
): Promise<ResearcherEarningsResult> {
  try {
    const where: any = {
      researcherAddress: address,
      status: 'COMPLETED',
    };

    if (filters.startDate || filters.endDate) {
      where.paidAt = {};
      if (filters.startDate) {
        where.paidAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.paidAt.lte = new Date(filters.endDate);
      }
    }

    const payments = await prisma.payment.findMany({
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
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    const totalEarnings = sumMoney(payments.map((p) => p.amount));

    const paymentsBySeverity = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };

    payments.forEach((p) => {
      const severity = p.vulnerability.severity as keyof typeof paymentsBySeverity;
      if (severity in paymentsBySeverity) {
        paymentsBySeverity[severity]++;
      }
    });

    return {
      success: true,
      data: {
        researcherAddress: address,
        totalEarnings,
        paymentCount: payments.length,
        paymentsBySeverity,
        payments: payments.map((p) => ({
          id: p.id,
          amount: toMoneyNumber(p.amount),
          currency: p.currency,
          txHash: p.txHash,
          paidAt: p.paidAt?.toISOString() || null,
          vulnerability: p.vulnerability,
        })),
      },
    };
  } catch (error: any) {
    log.error({ err: error }, 'Error fetching researcher earnings');
    return {
      success: false,
      error: {
        code: 'RESEARCHER_EARNINGS_ERROR',
        message: error.message || 'Failed to fetch researcher earnings',
      },
    };
  }
}

// ========================================
// Analytics API Functions (Tasks 8.8-8.10)
// ========================================

export interface LeaderboardResult {
  success: boolean;
  leaderboard?: Array<{
    researcherAddress: string;
    totalEarnings: number;
    paymentCount: number;
    averagePaymentAmount: number;
  }>;
  error?: { code: string; message: string };
}

export async function getEarningsLeaderboard(
  filters: Partial<LeaderboardQuery>
): Promise<LeaderboardResult> {
  try {
    const limit = filters.limit || 10;

    const where: any = {
      status: 'COMPLETED',
    };

    if (filters.startDate || filters.endDate) {
      where.paidAt = {};
      if (filters.startDate) {
        where.paidAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.paidAt.lte = new Date(filters.endDate);
      }
    }

    const leaderboardData = await prisma.payment.groupBy({
      by: ['researcherAddress'],
      where,
      _sum: { amount: true },
      _count: { id: true },
      orderBy: {
        _sum: { amount: 'desc' },
      },
      take: limit,
    });

    const leaderboard = leaderboardData.map((entry) => ({
      researcherAddress: entry.researcherAddress,
      totalEarnings: toMoneyNumber(entry._sum.amount || 0),
      paymentCount: entry._count.id,
      averagePaymentAmount:
        entry._count.id > 0
          ? fromUSDCMicro(toUSDCMicro(toMoneyNumber(entry._sum.amount || 0)) / BigInt(entry._count.id))
          : 0,
    }));

    return {
      success: true,
      leaderboard,
    };
  } catch (error: any) {
    log.error({ err: error }, 'Error fetching leaderboard');
    return {
      success: false,
      error: {
        code: 'LEADERBOARD_ERROR',
        message: error.message || 'Failed to fetch leaderboard',
      },
    };
  }
}

export interface PoolStatusResult {
  success: boolean;
  poolStatus?: {
    protocolId: string;
    availableBalance: string;
    availableBalanceFormatted: string;
    totalDeposited: number;
    totalPaid: number;
    remainingBalance: number;
    pendingPaymentsCount: number;
    pendingPaymentsTotal: number;
    recentTransactions: Array<{
      type: string;
      amount: number;
      txHash: string;
      timestamp: string;
    }>;
  };
  error?: { code: string; message: string };
}

export async function getPoolStatus(protocolId: string): Promise<PoolStatusResult> {
  try {
    const protocol = await prisma.protocol.findUnique({
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
      const bountyClient = new BountyPoolClient();
      // For now, use database balance since we need protocolId for on-chain query
      // See GitHub Issue #104
      availableBalance = toMoneyNumber(protocol.availableBounty).toString();
      availableBalanceFormatted = toMoneyNumber(protocol.availableBounty).toString();
    } catch (error: any) {
      log.warn({ err: error.message }, 'Failed to get on-chain balance');
      availableBalance = toMoneyNumber(protocol.availableBounty).toString();
      availableBalanceFormatted = toMoneyNumber(protocol.availableBounty).toString();
    }

    const pendingPayments = await prisma.payment.aggregate({
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
      toUSDCMicro(toMoneyNumber(protocol.availableBounty)) - toUSDCMicro(pendingPaymentsTotal)
    );

    const [fundingEvents, recentPayments] = await Promise.all([
      prisma.fundingEvent.findMany({
        where: { protocolId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.payment.findMany({
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
  } catch (error: any) {
    log.error({ err: error }, 'Error fetching pool status');
    return {
      success: false,
      error: {
        code: 'POOL_STATUS_ERROR',
        message: error.message || 'Failed to fetch pool status',
      },
    };
  }
}

/**
 * Propose manual payment for a researcher
 * This creates a payment proposal that can be reviewed by admins
 */
export async function proposeManualPayment(data: {
  protocolId: string;
  recipientAddress: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  justification: string;
  proposedBy: string;
}): Promise<{
  success: boolean;
  proposal?: any;
  error?: { code: string; message: string };
}> {
  try {
    // Validate protocol exists
    const protocol = await prisma.protocol.findUnique({
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
      CRITICAL: 10,
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
    const result = await prisma.$transaction(async (tx) => {
      // Create a vulnerability record for the manual submission
      const vulnerability = await tx.vulnerability.create({
        data: {
          protocolId: data.protocolId,
          vulnerabilityHash: `manual-${Date.now()}-${data.recipientAddress.slice(0, 8)}`,
          severity: data.severity,
          status: 'ACKNOWLEDGED', // Manual submissions are pre-acknowledged
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

    log.info({ vulnerabilityId: result.vulnerability.id, paymentId: result.payment.id, amount, recipientAddress: data.recipientAddress }, 'Manual payment created');

    // Queue the payment for on-chain execution
    const { addPaymentJob } = await import('../queues/payment.queue.js');
    const { ethers } = await import('ethers');
    const validationId = ethers.id(`manual-${result.payment.id}`);

    await addPaymentJob({
      paymentId: result.payment.id,
      validationId,
      protocolId: data.protocolId,
    });

    log.info({ paymentId: result.payment.id }, 'Manual payment queued for on-chain execution');

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
  } catch (error: any) {
    log.error({ err: error }, 'Error proposing manual payment');
    return {
      success: false,
      error: {
        code: 'PROPOSAL_ERROR',
        message: error.message || 'Failed to create payment proposal',
      },
    };
  }
}
