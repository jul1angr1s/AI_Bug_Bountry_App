/**
 * Demo Data Seed Script
 *
 * Creates realistic demo data with REAL on-chain transactions:
 * - Registers 2 agent identities on-chain (mints soulbound NFTs)
 * - Initializes reputation on-chain for both agents
 * - Records feedback on-chain (real BaseScan-verifiable transactions)
 * - Creates sample X.402 payment records and escrow data
 *
 * Requirements:
 * - Deployer wallet needs Base Sepolia ETH for gas (~0.01 ETH)
 * - PRIVATE_KEY, BASE_SEPOLIA_RPC_URL set in backend/.env
 * - Agent contracts deployed (AGENT_IDENTITY_REGISTRY_ADDRESS, etc.)
 *
 * Falls back to database-only mode if on-chain calls fail.
 *
 * Usage: npx tsx backend/scripts/seed-demo-data.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXPLORER_BASE_URL = 'https://sepolia.basescan.org';

// Use the deployer wallet as researcher and a derived address for validator
const RESEARCHER_WALLET = '0x43793B3d9F23FAC1df54d715Cb215b8A50e710c3';
const VALIDATOR_WALLET = '0x6b26F796b7C494a65ca42d29EF13E9eF1CeCE166';

async function main() {
  console.log('=== Demo Data Seed Script (On-Chain) ===\n');

  // Check if blockchain env vars are configured
  const hasBlockchainConfig = !!(
    process.env.PRIVATE_KEY &&
    process.env.BASE_SEPOLIA_RPC_URL &&
    process.env.AGENT_IDENTITY_REGISTRY_ADDRESS &&
    process.env.AGENT_REPUTATION_REGISTRY_ADDRESS
  );

  if (!hasBlockchainConfig) {
    console.log('⚠️  Missing blockchain env vars, running in database-only mode');
    console.log('   Required: PRIVATE_KEY, BASE_SEPOLIA_RPC_URL, AGENT_IDENTITY_REGISTRY_ADDRESS, AGENT_REPUTATION_REGISTRY_ADDRESS\n');
  }

  // =============================================
  // Phase A: Agent Registration
  // =============================================
  console.log('Phase A: Registering agents...\n');

  let researcherTxHash: string | null = null;
  let researcherNftId: string = '1';
  let validatorTxHash: string | null = null;
  let validatorNftId: string = '2';

  if (hasBlockchainConfig) {
    try {
      // Dynamic import to avoid errors when env vars aren't set
      const { AgentIdentityRegistryClient, AgentType } = await import(
        '../src/blockchain/contracts/AgentIdentityRegistryClient.js'
      );

      const identityClient = new AgentIdentityRegistryClient();

      // Register researcher
      const researcherRegistered = await identityClient.isRegistered(RESEARCHER_WALLET);
      if (!researcherRegistered) {
        const result = await identityClient.registerAgent(RESEARCHER_WALLET, AgentType.RESEARCHER);
        researcherTxHash = result.txHash;
        researcherNftId = result.tokenId;
        console.log(`✅ Researcher registered on-chain: tokenId=${researcherNftId}`);
        console.log(`   TX: ${EXPLORER_BASE_URL}/tx/${researcherTxHash}`);
      } else {
        const agent = await identityClient.getAgent(RESEARCHER_WALLET);
        researcherNftId = agent?.tokenId || '1';
        console.log(`ℹ️  Researcher already registered on-chain: tokenId=${researcherNftId}`);
      }

      // Register validator
      const validatorRegistered = await identityClient.isRegistered(VALIDATOR_WALLET);
      if (!validatorRegistered) {
        const result = await identityClient.registerAgent(VALIDATOR_WALLET, AgentType.VALIDATOR);
        validatorTxHash = result.txHash;
        validatorNftId = result.tokenId;
        console.log(`✅ Validator registered on-chain: tokenId=${validatorNftId}`);
        console.log(`   TX: ${EXPLORER_BASE_URL}/tx/${validatorTxHash}`);
      } else {
        const agent = await identityClient.getAgent(VALIDATOR_WALLET);
        validatorNftId = agent?.tokenId || '2';
        console.log(`ℹ️  Validator already registered on-chain: tokenId=${validatorNftId}`);
      }
    } catch (error) {
      console.error('⚠️  On-chain agent registration failed:', error instanceof Error ? error.message : error);
      console.log('   Falling back to database-only mode for agents\n');
    }
  }

  // Upsert database records
  const researcher = await prisma.agentIdentity.upsert({
    where: { walletAddress: RESEARCHER_WALLET.toLowerCase() },
    update: {
      onChainTxHash: researcherTxHash || undefined,
      agentNftId: researcherNftId,
    },
    create: {
      walletAddress: RESEARCHER_WALLET.toLowerCase(),
      agentType: 'RESEARCHER',
      isActive: true,
      onChainTxHash: researcherTxHash,
      agentNftId: researcherNftId,
    },
  });
  console.log(`   DB Researcher agent: ${researcher.id}`);

  const validator = await prisma.agentIdentity.upsert({
    where: { walletAddress: VALIDATOR_WALLET.toLowerCase() },
    update: {
      onChainTxHash: validatorTxHash || undefined,
      agentNftId: validatorNftId,
    },
    create: {
      walletAddress: VALIDATOR_WALLET.toLowerCase(),
      agentType: 'VALIDATOR',
      isActive: true,
      onChainTxHash: validatorTxHash,
      agentNftId: validatorNftId,
    },
  });
  console.log(`   DB Validator agent: ${validator.id}`);

  // =============================================
  // Phase B: Initialize Reputation On-Chain
  // =============================================
  console.log('\nPhase B: Initializing reputation...\n');

  if (hasBlockchainConfig) {
    try {
      const { AgentReputationRegistryClient } = await import(
        '../src/blockchain/contracts/AgentReputationRegistryClient.js'
      );

      const reputationClient = new AgentReputationRegistryClient();

      // Initialize reputation for researcher
      try {
        const result = await reputationClient.initializeReputation(researcherNftId, RESEARCHER_WALLET);
        console.log(`✅ Researcher reputation initialized on-chain`);
        console.log(`   TX: ${EXPLORER_BASE_URL}/tx/${result.txHash}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('already') || msg.includes('revert')) {
          console.log(`ℹ️  Researcher reputation already initialized on-chain`);
        } else {
          throw e;
        }
      }

      // Initialize reputation for validator
      try {
        const result = await reputationClient.initializeReputation(validatorNftId, VALIDATOR_WALLET);
        console.log(`✅ Validator reputation initialized on-chain`);
        console.log(`   TX: ${EXPLORER_BASE_URL}/tx/${result.txHash}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('already') || msg.includes('revert')) {
          console.log(`ℹ️  Validator reputation already initialized on-chain`);
        } else {
          throw e;
        }
      }
    } catch (error) {
      console.error('⚠️  On-chain reputation init failed:', error instanceof Error ? error.message : error);
      console.log('   Continuing with database-only reputation\n');
    }
  }

  // Create/update database reputation records
  const researcherRep = await prisma.agentReputation.upsert({
    where: { agentIdentityId: researcher.id },
    update: {},
    create: {
      agentIdentityId: researcher.id,
      confirmedCount: 0,
      rejectedCount: 0,
      totalSubmissions: 0,
      reputationScore: 0,
    },
  });

  await prisma.agentReputation.upsert({
    where: { agentIdentityId: validator.id },
    update: {},
    create: {
      agentIdentityId: validator.id,
      confirmedCount: 0,
      rejectedCount: 0,
      totalSubmissions: 0,
      reputationScore: 0,
    },
  });

  // =============================================
  // Phase C: Record Feedback On-Chain
  // =============================================
  console.log('\nPhase C: Recording feedback...\n');

  const feedbackEntries: {
    type: 'CONFIRMED_CRITICAL' | 'CONFIRMED_HIGH' | 'CONFIRMED_MEDIUM' | 'REJECTED';
    validationId: string;
  }[] = [
    { type: 'CONFIRMED_CRITICAL', validationId: 'demo-validation-critical-001' },
    { type: 'CONFIRMED_HIGH', validationId: 'demo-validation-high-001' },
    { type: 'CONFIRMED_MEDIUM', validationId: 'demo-validation-medium-001' },
    { type: 'REJECTED', validationId: 'demo-validation-rejected-001' },
  ];

  let confirmedOnChain = 0;
  let totalOnChain = 0;

  for (const entry of feedbackEntries) {
    let onChainFeedbackId: string | null = null;
    let txHash: string | null = null;

    // Try on-chain recording for first 3 (skip REJECTED for variety - 1 off-chain)
    if (hasBlockchainConfig && entry.type !== 'REJECTED') {
      try {
        const { AgentReputationRegistryClient, FeedbackType: OnChainFT } = await import(
          '../src/blockchain/contracts/AgentReputationRegistryClient.js'
        );

        const ftMap: Record<string, number> = {
          CONFIRMED_CRITICAL: OnChainFT.CONFIRMED_CRITICAL,
          CONFIRMED_HIGH: OnChainFT.CONFIRMED_HIGH,
          CONFIRMED_MEDIUM: OnChainFT.CONFIRMED_MEDIUM,
          REJECTED: OnChainFT.REJECTED,
        };

        const reputationClient = new AgentReputationRegistryClient();
        const result = await reputationClient.recordFeedback(
          researcherNftId,
          validatorNftId,
          entry.validationId,
          ftMap[entry.type]
        );

        onChainFeedbackId = result.feedbackId;
        txHash = result.txHash;
        totalOnChain++;
        if (entry.type !== 'REJECTED') confirmedOnChain++;

        console.log(`✅ ${entry.type} on-chain: feedbackId=${result.feedbackId.slice(0, 18)}...`);
        console.log(`   TX: ${EXPLORER_BASE_URL}/tx/${result.txHash}`);
      } catch (error) {
        console.error(`⚠️  On-chain feedback ${entry.type} failed:`, error instanceof Error ? error.message : error);
      }
    }

    // Create database record
    await prisma.agentFeedback.create({
      data: {
        researcherAgentId: researcher.id,
        validatorAgentId: validator.id,
        feedbackType: entry.type,
        validationId: entry.validationId,
        onChainFeedbackId: onChainFeedbackId,
        txHash: txHash,
      },
    });

    if (!txHash) {
      console.log(`   ${entry.type}: database-only (off-chain)`);
    }
  }

  // Update reputation scores in DB based on on-chain results
  const totalSubmissions = feedbackEntries.length;
  const confirmedCount = feedbackEntries.filter(f => f.type !== 'REJECTED').length;
  const rejectedCount = feedbackEntries.filter(f => f.type === 'REJECTED').length;
  const reputationScore = Math.round((confirmedCount * 100) / totalSubmissions);

  await prisma.agentReputation.update({
    where: { agentIdentityId: researcher.id },
    data: {
      confirmedCount,
      rejectedCount,
      totalSubmissions,
      reputationScore,
      lastUpdated: new Date(),
    },
  });

  // =============================================
  // Phase D: X.402 Payment Records
  // =============================================
  console.log('\n4. Creating X.402 payment records...');

  const x402Payments = [
    {
      requestType: 'PROTOCOL_REGISTRATION' as const,
      requesterAddress: RESEARCHER_WALLET.toLowerCase(),
      amount: BigInt(1000000),
      status: 'COMPLETED' as const,
      txHash: null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      completedAt: new Date(),
    },
    {
      requestType: 'PROTOCOL_REGISTRATION' as const,
      requesterAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
      amount: BigInt(1000000),
      status: 'COMPLETED' as const,
      txHash: null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      completedAt: new Date(Date.now() - 3600000),
    },
    {
      requestType: 'FINDING_SUBMISSION' as const,
      requesterAddress: RESEARCHER_WALLET.toLowerCase(),
      amount: BigInt(500000),
      status: 'PENDING' as const,
      txHash: null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      completedAt: null,
    },
  ];

  for (const payment of x402Payments) {
    const p = await prisma.x402PaymentRequest.create({ data: payment });
    console.log(`   ${payment.requestType} - ${payment.status}: ${p.id}`);
  }

  // =============================================
  // Phase E: Escrow Records
  // =============================================
  console.log('\n5. Creating escrow records...');

  const escrow = await prisma.agentEscrow.upsert({
    where: { agentIdentityId: researcher.id },
    update: {
      balance: BigInt(5000000),
      totalDeposited: BigInt(10000000),
      totalDeducted: BigInt(5000000),
    },
    create: {
      agentIdentityId: researcher.id,
      balance: BigInt(5000000),
      totalDeposited: BigInt(10000000),
      totalDeducted: BigInt(5000000),
    },
  });

  const escrowTxs = [
    {
      agentEscrowId: escrow.id,
      transactionType: 'DEPOSIT' as const,
      amount: BigInt(10000000),
      txHash: null,
    },
    {
      agentEscrowId: escrow.id,
      transactionType: 'SUBMISSION_FEE' as const,
      amount: BigInt(500000),
      txHash: null,
    },
  ];

  for (const tx of escrowTxs) {
    const t = await prisma.escrowTransaction.create({ data: tx });
    console.log(`   ${tx.transactionType}: ${t.id}`);
  }

  // =============================================
  // Summary
  // =============================================
  console.log('\n=== Demo Data Summary ===');
  console.log(`Agents: 2 (1 Researcher, 1 Validator)`);
  console.log(`  Researcher NFT: tokenId=${researcherNftId}${researcherTxHash ? ' (on-chain)' : ' (db-only)'}`);
  console.log(`  Validator NFT: tokenId=${validatorNftId}${validatorTxHash ? ' (on-chain)' : ' (db-only)'}`);
  console.log(`Reputation: score=${reputationScore}, confirmed=${confirmedCount}/${totalSubmissions}`);
  console.log(`On-chain feedback: ${totalOnChain}/${feedbackEntries.length}`);
  console.log(`X.402 payments: 3`);
  console.log(`Escrow: 1 account, 2 transactions`);

  if (researcherTxHash || validatorTxHash || totalOnChain > 0) {
    console.log(`\n🔗 Verify on BaseScan:`);
    if (researcherTxHash) console.log(`  Researcher: ${EXPLORER_BASE_URL}/tx/${researcherTxHash}`);
    if (validatorTxHash) console.log(`  Validator: ${EXPLORER_BASE_URL}/tx/${validatorTxHash}`);
  }

  console.log(`\nExplorer: ${EXPLORER_BASE_URL}`);
}

main()
  .catch((e) => {
    console.error('Error seeding demo data:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
