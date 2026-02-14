import { injectable, inject } from 'tsyringe';
import { TOKENS } from '../../di/tokens.js';
import type { ILogger } from '../../di/interfaces/ILogger.js';
import type { PrismaClient, Prisma } from '@prisma/client';
import type {
  ResearcherEarningsQuery,
  LeaderboardQuery,
} from '../../schemas/payment.schema.js';
import type {
  PaymentStatistics,
  StatsFilters,
  ResearcherEarningsResult,
  LeaderboardResult,
} from './types.js';

/**
 * Payment statistics, researcher earnings, and leaderboard operations.
 */
@injectable()
export class PaymentStatisticsService {
  private logger: ILogger;

  constructor(
    @inject(TOKENS.Logger) logger: ILogger,
    @inject(TOKENS.Database) private prisma: PrismaClient,
  ) {
    this.logger = logger.child({ service: 'PaymentStatisticsService' });
  }

  /**
   * Get aggregated payment statistics.
   */
  async getPaymentStats(
    filters: StatsFilters = {},
  ): Promise<PaymentStatistics> {
    const { protocolId, groupBy, days = 30 } = filters;

    // Build where clause
    const where: Prisma.PaymentWhereInput = {};

    if (protocolId) {
      where.vulnerability = { protocolId };
    }

    // Fetch all payments matching filters
    const payments = await this.prisma.payment.findMany({
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
    const totalAmountPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const averagePaymentAmount =
      completedPayments.length > 0 ? totalAmountPaid / completedPayments.length : 0;

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
            current.amount += payment.amount;
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
   * Get earnings data for a specific researcher address.
   */
  async getResearcherEarnings(
    address: string,
    filters: Partial<ResearcherEarningsQuery>,
  ): Promise<ResearcherEarningsResult> {
    try {
      const where: Prisma.PaymentWhereInput = {
        researcherAddress: address,
        status: 'COMPLETED',
      };

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

      const payments = await this.prisma.payment.findMany({
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

      const totalEarnings = payments.reduce((sum, p) => sum + p.amount, 0);

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
            amount: p.amount,
            currency: p.currency,
            txHash: p.txHash,
            paidAt: p.paidAt?.toISOString() || null,
            vulnerability: p.vulnerability,
          })),
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Error fetching researcher earnings', {
        address,
        error: msg,
      });
      return {
        success: false,
        error: {
          code: 'RESEARCHER_EARNINGS_ERROR',
          message: msg || 'Failed to fetch researcher earnings',
        },
      };
    }
  }

  /**
   * Get earnings leaderboard ranked by total earnings.
   */
  async getEarningsLeaderboard(
    filters: Partial<LeaderboardQuery>,
  ): Promise<LeaderboardResult> {
    try {
      const limit = filters.limit || 10;

      const where: Prisma.PaymentWhereInput = {
        status: 'COMPLETED',
      };

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

      const leaderboardData = await this.prisma.payment.groupBy({
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
        totalEarnings: entry._sum.amount || 0,
        paymentCount: entry._count.id,
        averagePaymentAmount:
          entry._count.id > 0 ? (entry._sum.amount || 0) / entry._count.id : 0,
      }));

      return {
        success: true,
        leaderboard,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Error fetching leaderboard', { error: msg });
      return {
        success: false,
        error: {
          code: 'LEADERBOARD_ERROR',
          message: msg || 'Failed to fetch leaderboard',
        },
      };
    }
  }
}
