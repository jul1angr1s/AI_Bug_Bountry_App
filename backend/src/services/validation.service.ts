import { getPrismaClient } from '../lib/prisma.js';
import { FindingStatus, Severity } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = getPrismaClient();

export interface ValidationAnalysis {
  isValid: boolean;
  confidence: number; // 0-100
  reasoning: string;
  severity?: Severity;
  exploitability?: string;
}

/**
 * Validation Service - Business logic for proof validation
 *
 * This service handles:
 * - Fetching proof data from Finding records
 * - Coordinating LLM-based proof analysis
 * - Updating Finding status and confidence scores
 * - Triggering payment queue for validated findings
 */
export class ValidationService {
  /**
   * Get finding by ID with proof data
   */
  async getFinding(findingId: string) {
    const finding = await prisma.finding.findUnique({
      where: { id: findingId },
      include: {
        scan: {
          include: {
            protocol: true,
          },
        },
        proofs: {
          where: { status: 'ENCRYPTED' },
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!finding) {
      throw new Error(`Finding ${findingId} not found`);
    }

    return finding;
  }

  /**
   * Validate a finding with LLM analysis
   */
  async validateFinding(
    findingId: string,
    analysis: ValidationAnalysis
  ): Promise<void> {
    const { isValid, confidence, reasoning } = analysis;

    // Determine status based on validation result
    const status: FindingStatus = isValid ? 'VALIDATED' : 'REJECTED';

    // Update finding with validation result
    await prisma.finding.update({
      where: { id: findingId },
      data: {
        status,
        confidenceScore: confidence / 100, // Convert to 0-1 range
        validatedAt: new Date(),
        // Store reasoning in description or add to existing
        description: `${reasoning}\n\nOriginal: ${(
          await prisma.finding.findUnique({
            where: { id: findingId },
            select: { description: true },
          })
        )?.description}`,
      },
    });

    console.log(
      `[ValidationService] Finding ${findingId} ${status} with ${confidence}% confidence`
    );

    // If validated, trigger payment queue
    if (isValid && status === 'VALIDATED') {
      await this.triggerPayment(findingId);
    }
  }

  /**
   * Trigger payment for validated finding
   */
  private async triggerPayment(findingId: string): Promise<void> {
    // Get finding details
    const finding = await prisma.finding.findUnique({
      where: { id: findingId },
      include: {
        scan: {
          include: {
            protocol: true,
          },
        },
      },
    });

    if (!finding) {
      throw new Error(`Finding ${findingId} not found`);
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findFirst({
      where: {
        vulnerability: {
          id: finding.id,
        },
      },
    });

    if (existingPayment) {
      console.log(
        `[ValidationService] Payment already exists for finding ${findingId}`
      );
      return;
    }

    // Calculate payment amount based on severity
    const amount = this.calculateBountyAmount(finding.severity);

    // Create payment record
    const researcherAddress = await this.resolveResearcherAddress();

    const payment = await prisma.payment.create({
      data: {
        vulnerabilityId: finding.id,
        researcherAddress,
        amount,
        currency: 'USDC',
        status: 'PENDING',
        queuedAt: new Date(),
      },
    });

    console.log(`[ValidationService] Payment ${payment.id} queued for finding ${findingId}`);

    // Import and queue payment job
    const { addPaymentJob } = await import('../queues/payment.queue.js');
    const validationId = ethers.id(findingId);

    await addPaymentJob({
      paymentId: payment.id,
      validationId,
      protocolId: finding.scan.protocolId,
    });
  }

  /**
   * Calculate bounty amount based on severity
   */
  private calculateBountyAmount(severity: Severity): number {
    const baseReward = 500; // $500 base

    const multipliers: Record<Severity, number> = {
      CRITICAL: 10,
      HIGH: 5,
      MEDIUM: 2,
      LOW: 1,
      INFO: 0.5,
    };

    return baseReward * (multipliers[severity] || 1);
  }

  private async resolveResearcherAddress(): Promise<string> {
    if (process.env.RESEARCHER_ADDRESS) {
      return process.env.RESEARCHER_ADDRESS;
    }

    if (process.env.PRIVATE_KEY2) {
      const formattedKey = process.env.PRIVATE_KEY2.startsWith('0x')
        ? process.env.PRIVATE_KEY2
        : `0x${process.env.PRIVATE_KEY2}`;
      return new ethers.Wallet(formattedKey).address;
    }

    return (
      process.env.DEFAULT_RESEARCHER_ADDRESS ||
      '0x0000000000000000000000000000000000000000'
    );
  }

  /**
   * Get validation statistics
   */
  async getValidationStats() {
    const [total, validated, rejected, pending] = await Promise.all([
      prisma.finding.count(),
      prisma.finding.count({ where: { status: 'VALIDATED' } }),
      prisma.finding.count({ where: { status: 'REJECTED' } }),
      prisma.finding.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      total,
      validated,
      rejected,
      pending,
      validationRate:
        total > 0 ? Math.round((validated / (validated + rejected)) * 100) : 0,
    };
  }
}

// Singleton instance
let validationService: ValidationService | null = null;

export function getValidationService(): ValidationService {
  if (!validationService) {
    validationService = new ValidationService();
  }
  return validationService;
}
