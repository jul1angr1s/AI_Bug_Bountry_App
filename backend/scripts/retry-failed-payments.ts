/**
 * Retry Failed Payments Script
 *
 * Queries all FAILED payments, updates their amounts to match
 * the contract's calculated amounts (based on severity), resets
 * to PENDING, and re-queues each for processing.
 *
 * Usage: npx tsx scripts/retry-failed-payments.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { BountyPoolClient, BountySeverity } from '../src/blockchain/contracts/BountyPoolClient.js';
import { addPaymentJob } from '../src/queues/payment.queue.js';

const prisma = new PrismaClient();

/**
 * Map Prisma Severity enum to BountySeverity enum
 */
const SEVERITY_MAP: Record<string, BountySeverity> = {
  CRITICAL: BountySeverity.CRITICAL,
  HIGH: BountySeverity.HIGH,
  MEDIUM: BountySeverity.MEDIUM,
  LOW: BountySeverity.LOW,
  INFO: BountySeverity.INFORMATIONAL,
};

async function main() {
  console.log('=== Retry Failed Payments ===\n');

  // Step 1: Query all failed payments
  const failedPayments = await prisma.payment.findMany({
    where: { status: 'FAILED' },
    include: {
      vulnerability: {
        include: {
          protocol: true,
        },
      },
    },
  });

  if (failedPayments.length === 0) {
    console.log('No failed payments found.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${failedPayments.length} failed payment(s):\n`);

  // Step 2: Get contract-calculated amounts
  const bountyClient = new BountyPoolClient();

  for (const payment of failedPayments) {
    const vuln = payment.vulnerability;
    const protocol = vuln.protocol;
    const severity = SEVERITY_MAP[vuln.severity] ?? BountySeverity.INFORMATIONAL;

    let contractAmount: number;
    try {
      contractAmount = await bountyClient.calculateBountyAmount(severity);
    } catch {
      console.error(`  [SKIP] Could not calculate amount for ${payment.id} (severity: ${vuln.severity})`);
      continue;
    }

    console.log(`Payment ${payment.id}:`);
    console.log(`  Severity: ${vuln.severity}`);
    console.log(`  DB amount: ${payment.amount} USDC → Contract amount: ${contractAmount} USDC`);
    console.log(`  Failure reason: ${payment.failureReason}`);
    console.log(`  Protocol: ${protocol.githubUrl}`);
    console.log(`  On-chain ID: ${protocol.onChainProtocolId}`);

    if (!protocol.onChainProtocolId) {
      console.log('  [SKIP] Protocol has no on-chain ID');
      continue;
    }

    // Step 3: Update payment — fix amount, reset to PENDING
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        amount: contractAmount,
        status: 'PENDING',
        failureReason: null,
        processedAt: null,
        queuedAt: new Date(),
      },
    });

    // Also update the vulnerability bounty to match
    await prisma.vulnerability.update({
      where: { id: vuln.id },
      data: { bounty: contractAmount },
    });

    console.log(`  Updated amount to ${contractAmount} USDC, reset to PENDING`);

    // Step 4: Re-queue for processing
    await addPaymentJob({
      paymentId: payment.id,
      validationId: vuln.vulnerabilityHash, // findingId used as validationId
      protocolId: protocol.onChainProtocolId,
    });

    console.log(`  Re-queued for processing`);
    console.log('');
  }

  console.log('Done! Check /payments page for updated statuses.');

  // Give BullMQ time to enqueue
  await new Promise(resolve => setTimeout(resolve, 1000));
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
