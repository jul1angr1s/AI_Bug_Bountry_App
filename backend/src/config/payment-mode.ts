/**
 * Payment Mode Configuration
 *
 * This module provides a unified way to determine and log the current payment mode.
 * It helps avoid confusion about whether payments are using real on-chain transactions
 * or demo mode fallback.
 */

import { PrismaClient } from '@prisma/client';

export enum PaymentMode {
  PRODUCTION = 'PRODUCTION',
  DEMO = 'DEMO',
  UNKNOWN = 'UNKNOWN',
}

export interface PaymentModeStatus {
  mode: PaymentMode;
  reason: string;
  protocolId?: string;
  onChainProtocolId?: string | null;
  poolBalance?: number;
}

/**
 * Determine the current payment mode for a protocol
 */
export async function getPaymentMode(
  prisma: PrismaClient,
  protocolId?: string
): Promise<PaymentModeStatus> {
  try {
    // Find the most recent protocol or specific one
    const protocol = protocolId
      ? await prisma.protocol.findUnique({
          where: { id: protocolId },
          select: { id: true, onChainProtocolId: true, totalBountyPool: true },
        })
      : await prisma.protocol.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { id: true, onChainProtocolId: true, totalBountyPool: true },
        });

    if (!protocol) {
      return {
        mode: PaymentMode.UNKNOWN,
        reason: 'No protocol found in database',
      };
    }

    // Check if on-chain protocol ID is set
    if (!protocol.onChainProtocolId) {
      return {
        mode: PaymentMode.DEMO,
        reason: 'Protocol lacks onChainProtocolId - demo mode fallback',
        protocolId: protocol.id,
        onChainProtocolId: null,
      };
    }

    // Check pool balance
    const poolBalance = protocol.totalBountyPool || 0;
    if (poolBalance === 0) {
      return {
        mode: PaymentMode.DEMO,
        reason: 'Pool balance is 0 - demo mode fallback',
        protocolId: protocol.id,
        onChainProtocolId: protocol.onChainProtocolId,
        poolBalance: 0,
      };
    }

    return {
      mode: PaymentMode.PRODUCTION,
      reason: 'On-chain protocol ID set and pool has funds',
      protocolId: protocol.id,
      onChainProtocolId: protocol.onChainProtocolId,
      poolBalance,
    };
  } catch (error) {
    return {
      mode: PaymentMode.UNKNOWN,
      reason: `Error checking payment mode: ${error}`,
    };
  }
}

/**
 * Log the current payment mode with clear formatting
 */
export function logPaymentMode(status: PaymentModeStatus): void {
  const modeEmoji =
    status.mode === PaymentMode.PRODUCTION
      ? '💰'
      : status.mode === PaymentMode.DEMO
        ? '🎭'
        : '❓';

  console.log('');
  console.log('='.repeat(50));
  console.log(`${modeEmoji} Payment Mode: ${status.mode}`);
  console.log('='.repeat(50));
  console.log(`Reason: ${status.reason}`);

  if (status.protocolId) {
    console.log(`Protocol ID: ${status.protocolId}`);
  }
  if (status.onChainProtocolId !== undefined) {
    console.log(`On-Chain ID: ${status.onChainProtocolId || 'NOT SET'}`);
  }
  if (status.poolBalance !== undefined) {
    console.log(`Pool Balance: ${status.poolBalance} USDC`);
  }
  console.log('='.repeat(50));
  console.log('');
}

/**
 * Check and log payment mode - convenience function for worker startup
 */
export async function checkAndLogPaymentMode(prisma: PrismaClient): Promise<PaymentModeStatus> {
  const status = await getPaymentMode(prisma);
  logPaymentMode(status);
  return status;
}
