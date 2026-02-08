/**
 * Demo Data Seed Script
 *
 * Creates realistic demo data for management presentations:
 * - Registers 2 agent identities (1 RESEARCHER, 1 VALIDATOR)
 * - Creates sample X.402 payment records
 * - Records sample reputation feedback
 * - Prints all created records with their explorer URLs
 *
 * Usage: npx tsx backend/scripts/seed-demo-data.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXPLORER_BASE_URL = 'https://sepolia.basescan.org';

// Use the deployer wallet as researcher and a derived address for validator
const RESEARCHER_WALLET = '0x43793B3d9F23FAC1df54d715Cb215b8A50e710c3';
const VALIDATOR_WALLET = '0x1234567890AbcdEF1234567890aBcDEF12345678';

async function main() {
  console.log('=== Demo Data Seed Script ===\n');

  // 1. Register Agent Identities
  console.log('1. Creating agent identities...');

  const researcher = await prisma.agentIdentity.upsert({
    where: { walletAddress: RESEARCHER_WALLET.toLowerCase() },
    update: {},
    create: {
      walletAddress: RESEARCHER_WALLET.toLowerCase(),
      agentType: 'RESEARCHER',
      isActive: true,
      onChainTxHash: '0xdemo_researcher_registration_tx_hash_placeholder_for_display',
      agentNftId: '1',
    },
  });
  console.log(`   Researcher agent: ${researcher.id}`);
  console.log(`   Wallet: ${RESEARCHER_WALLET}`);

  const validator = await prisma.agentIdentity.upsert({
    where: { walletAddress: VALIDATOR_WALLET.toLowerCase() },
    update: {},
    create: {
      walletAddress: VALIDATOR_WALLET.toLowerCase(),
      agentType: 'VALIDATOR',
      isActive: true,
      onChainTxHash: '0xdemo_validator_registration_tx_hash_placeholder_for_display',
      agentNftId: '2',
    },
  });
  console.log(`   Validator agent: ${validator.id}`);
  console.log(`   Wallet: ${VALIDATOR_WALLET}`);

  // 2. Create Reputation Records
  console.log('\n2. Creating reputation records...');

  const researcherRep = await prisma.agentReputation.upsert({
    where: { agentIdentityId: researcher.id },
    update: {
      confirmedCount: 12,
      rejectedCount: 2,
      inconclusiveCount: 1,
      totalSubmissions: 15,
      reputationScore: 85,
    },
    create: {
      agentIdentityId: researcher.id,
      confirmedCount: 12,
      rejectedCount: 2,
      inconclusiveCount: 1,
      totalSubmissions: 15,
      reputationScore: 85,
    },
  });
  console.log(`   Researcher reputation: score=${researcherRep.reputationScore}, confirmed=${researcherRep.confirmedCount}`);

  const validatorRep = await prisma.agentReputation.upsert({
    where: { agentIdentityId: validator.id },
    update: {
      confirmedCount: 8,
      rejectedCount: 1,
      inconclusiveCount: 0,
      totalSubmissions: 9,
      reputationScore: 92,
    },
    create: {
      agentIdentityId: validator.id,
      confirmedCount: 8,
      rejectedCount: 1,
      inconclusiveCount: 0,
      totalSubmissions: 9,
      reputationScore: 92,
    },
  });
  console.log(`   Validator reputation: score=${validatorRep.reputationScore}, confirmed=${validatorRep.confirmedCount}`);

  // 3. Create Sample Feedback
  console.log('\n3. Creating feedback records...');

  const feedbackTypes = [
    'CONFIRMED_CRITICAL',
    'CONFIRMED_HIGH',
    'CONFIRMED_MEDIUM',
    'REJECTED',
  ] as const;

  for (const feedbackType of feedbackTypes) {
    const fb = await prisma.agentFeedback.create({
      data: {
        researcherAgentId: researcher.id,
        validatorAgentId: validator.id,
        feedbackType,
        onChainFeedbackId: feedbackType !== 'REJECTED'
          ? `0xdemo_feedback_${feedbackType.toLowerCase()}_hash`
          : null,
      },
    });
    console.log(`   Feedback ${feedbackType}: ${fb.id} ${fb.onChainFeedbackId ? '(on-chain)' : '(off-chain)'}`);
  }

  // 4. Create X.402 Payment Records
  console.log('\n4. Creating X.402 payment records...');

  const x402Payments = [
    {
      requestType: 'PROTOCOL_REGISTRATION' as const,
      requesterAddress: RESEARCHER_WALLET.toLowerCase(),
      amount: BigInt(1000000), // 1 USDC
      status: 'COMPLETED' as const,
      txHash: '0xdemo_x402_protocol_reg_payment_tx_hash_for_basescan_display',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      completedAt: new Date(),
    },
    {
      requestType: 'PROTOCOL_REGISTRATION' as const,
      requesterAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
      amount: BigInt(1000000), // 1 USDC
      status: 'COMPLETED' as const,
      txHash: '0xdemo_x402_protocol_reg_payment2_tx_hash_for_basescan_display',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      completedAt: new Date(Date.now() - 3600000),
    },
    {
      requestType: 'FINDING_SUBMISSION' as const,
      requesterAddress: RESEARCHER_WALLET.toLowerCase(),
      amount: BigInt(500000), // 0.5 USDC
      status: 'PENDING' as const,
      txHash: null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      completedAt: null,
    },
  ];

  for (const payment of x402Payments) {
    const p = await prisma.x402PaymentRequest.create({ data: payment });
    console.log(`   ${payment.requestType} - ${payment.status}: ${p.id}`);
    if (payment.txHash) {
      console.log(`     TX: ${EXPLORER_BASE_URL}/tx/${payment.txHash}`);
    }
  }

  // 5. Create Escrow Records
  console.log('\n5. Creating escrow records...');

  const escrow = await prisma.agentEscrow.upsert({
    where: { agentIdentityId: researcher.id },
    update: {
      balance: BigInt(5000000), // 5 USDC
      totalDeposited: BigInt(10000000), // 10 USDC
      totalDeducted: BigInt(5000000), // 5 USDC
    },
    create: {
      agentIdentityId: researcher.id,
      balance: BigInt(5000000),
      totalDeposited: BigInt(10000000),
      totalDeducted: BigInt(5000000),
    },
  });

  // Create escrow transactions
  const escrowTxs = [
    {
      agentEscrowId: escrow.id,
      transactionType: 'DEPOSIT' as const,
      amount: BigInt(10000000),
      txHash: '0xdemo_escrow_deposit_tx_hash_for_basescan_verification',
    },
    {
      agentEscrowId: escrow.id,
      transactionType: 'SUBMISSION_FEE' as const,
      amount: BigInt(500000),
      txHash: '0xdemo_escrow_submission_fee_tx_hash_for_verification',
    },
  ];

  for (const tx of escrowTxs) {
    const t = await prisma.escrowTransaction.create({ data: tx });
    console.log(`   ${tx.transactionType}: ${t.id}`);
    if (tx.txHash) {
      console.log(`     TX: ${EXPLORER_BASE_URL}/tx/${tx.txHash}`);
    }
  }

  // Summary
  console.log('\n=== Demo Data Summary ===');
  console.log(`Agents: 2 (1 Researcher, 1 Validator)`);
  console.log(`Reputation records: 2`);
  console.log(`Feedback records: 4`);
  console.log(`X.402 payments: 3`);
  console.log(`Escrow records: 1 account, 2 transactions`);
  console.log('\nAll records use demo transaction hashes.');
  console.log('For real on-chain verification, use the live X.402 payment flow.');
  console.log(`\nExplorer: ${EXPLORER_BASE_URL}`);
}

main()
  .catch((e) => {
    console.error('Error seeding demo data:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
