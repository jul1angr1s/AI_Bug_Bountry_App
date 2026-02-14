import type { PaymentStatus, Severity } from '@prisma/client';

// Re-export error classes from centralized location
export { PaymentNotFoundError, InsufficientFundsError } from '../../errors/payment.errors.js';
export { ValidationNotFoundError, VulnerabilityNotFoundError } from '../../errors/validation.errors.js';

// ========================================
// Shared Interfaces
// ========================================

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

// ========================================
// USDC Result Interfaces
// ========================================

export interface UsdcAllowanceResult {
  success: boolean;
  allowance?: string;
  allowanceFormatted?: string;
  error?: { code: string; message: string };
}

export interface UsdcBalanceResult {
  success: boolean;
  balance?: string;
  balanceFormatted?: string;
  error?: { code: string; message: string };
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

// ========================================
// Payment List / Details Result Interfaces
// ========================================

export interface PaymentListResult {
  success: boolean;
  payments?: Record<string, unknown>[];
  pagination?: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  error?: { code: string; message: string };
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
    payments: Record<string, unknown>[];
  };
  error?: { code: string; message: string };
}

// ========================================
// Analytics Result Interfaces
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
