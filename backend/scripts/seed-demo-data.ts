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

// Delay between on-chain txs to avoid RPC "in-flight transaction limit" rate limiting
const TX_DELAY_MS = 5000;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

      // Wait before next tx to avoid rate limiting
      await sleep(TX_DELAY_MS);

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

      // Wait for previous txs to clear
      await sleep(TX_DELAY_MS);

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

      // Wait before next tx
      await sleep(TX_DELAY_MS);

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

        // Wait between feedback txs to avoid rate limiting
        await sleep(TX_DELAY_MS);

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
  // Phase F: Agent-Protocol Associations (WS1)
  // =============================================
  console.log('\n6. Creating agent-protocol associations...');

  // Find demo protocol (if one exists)
  const demoProtocol = await prisma.protocol.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (demoProtocol) {
    // Associate researcher with protocol
    await prisma.protocolAgentAssociation.upsert({
      where: {
        protocolId_role: { protocolId: demoProtocol.id, role: 'RESEARCHER' },
      },
      update: { agentIdentityId: researcher.id },
      create: {
        protocolId: demoProtocol.id,
        agentIdentityId: researcher.id,
        role: 'RESEARCHER',
      },
    });
    console.log(`   Researcher → Protocol ${demoProtocol.id.slice(0, 8)}...`);

    // Associate validator with protocol
    await prisma.protocolAgentAssociation.upsert({
      where: {
        protocolId_role: { protocolId: demoProtocol.id, role: 'VALIDATOR' },
      },
      update: { agentIdentityId: validator.id },
      create: {
        protocolId: demoProtocol.id,
        agentIdentityId: validator.id,
        role: 'VALIDATOR',
      },
    });
    console.log(`   Validator → Protocol ${demoProtocol.id.slice(0, 8)}...`);
  } else {
    console.log('   ⚠️  No protocol found, skipping associations');
  }

  // =============================================
  // Phase G: Bidirectional Feedback for ALL agents (WS2)
  // =============================================
  console.log('\n7. Creating bidirectional feedback for all agents...');

  // Get ALL agents in the system
  const allAgents = await prisma.agentIdentity.findMany();
  const allResearchers = allAgents.filter(a => a.agentType === 'RESEARCHER');
  const allValidators = allAgents.filter(a => a.agentType === 'VALIDATOR');

  const feedbackTypes = [
    'CONFIRMED_CRITICAL',
    'CONFIRMED_HIGH',
    'CONFIRMED_MEDIUM',
    'CONFIRMED_LOW',
    'REJECTED',
  ] as const;

  let totalFeedbackCreated = 0;

  // For every researcher-validator pair, create bidirectional feedback
  for (const r of allResearchers) {
    for (const v of allValidators) {
      // Delete existing feedback between this pair to avoid duplicates
      await prisma.agentFeedback.deleteMany({
        where: {
          researcherAgentId: r.id,
          validatorAgentId: v.id,
        },
      });

      // Pick random feedback types for variety
      const numFeedbacks = 3 + Math.floor(Math.random() * 3); // 3-5 feedbacks per pair
      let confirmedAsResearcher = 0;
      let rejectedAsResearcher = 0;
      let confirmedAsValidator = 0;
      let rejectedAsValidator = 0;

      for (let i = 0; i < numFeedbacks; i++) {
        const ft = feedbackTypes[i % feedbackTypes.length];
        const isRejected = ft === 'REJECTED';

        // Validator rates researcher
        await prisma.agentFeedback.create({
          data: {
            researcherAgentId: r.id,
            validatorAgentId: v.id,
            feedbackType: ft,
            feedbackDirection: 'VALIDATOR_RATES_RESEARCHER',
            validationId: `demo-v2r-${r.id.slice(0, 8)}-${v.id.slice(0, 8)}-${i}`,
          },
        });
        if (isRejected) rejectedAsResearcher++;
        else confirmedAsResearcher++;

        // Researcher rates validator (bidirectional)
        const reverseFt = feedbackTypes[(i + 1) % feedbackTypes.length];
        const reverseRejected = reverseFt === 'REJECTED';

        await prisma.agentFeedback.create({
          data: {
            researcherAgentId: r.id,
            validatorAgentId: v.id,
            feedbackType: reverseFt,
            feedbackDirection: 'RESEARCHER_RATES_VALIDATOR',
            validationId: `demo-r2v-${r.id.slice(0, 8)}-${v.id.slice(0, 8)}-${i}`,
          },
        });
        if (reverseRejected) rejectedAsValidator++;
        else confirmedAsValidator++;

        totalFeedbackCreated += 2;
      }

      console.log(`   ${r.walletAddress.slice(0, 10)}... <-> ${v.walletAddress.slice(0, 10)}...: ${numFeedbacks * 2} feedbacks`);

      // Update researcher reputation (as researcher)
      const rTotal = confirmedAsResearcher + rejectedAsResearcher;
      const rScore = rTotal > 0 ? Math.round((confirmedAsResearcher * 100) / rTotal) : 0;

      await prisma.agentReputation.upsert({
        where: { agentIdentityId: r.id },
        update: {
          confirmedCount: { increment: confirmedAsResearcher },
          rejectedCount: { increment: rejectedAsResearcher },
          totalSubmissions: { increment: rTotal },
          reputationScore: rScore,
          lastUpdated: new Date(),
        },
        create: {
          agentIdentityId: r.id,
          confirmedCount: confirmedAsResearcher,
          rejectedCount: rejectedAsResearcher,
          totalSubmissions: rTotal,
          reputationScore: rScore,
        },
      });

      // Update validator reputation (as validator)
      const vTotal = confirmedAsValidator + rejectedAsValidator;
      const vScore = vTotal > 0 ? Math.round((confirmedAsValidator * 100) / vTotal) : 0;

      await prisma.agentReputation.upsert({
        where: { agentIdentityId: v.id },
        update: {
          validatorConfirmedCount: { increment: confirmedAsValidator },
          validatorRejectedCount: { increment: rejectedAsValidator },
          validatorTotalSubmissions: { increment: vTotal },
          validatorReputationScore: vScore,
          validatorLastUpdated: new Date(),
        },
        create: {
          agentIdentityId: v.id,
          validatorConfirmedCount: confirmedAsValidator,
          validatorRejectedCount: rejectedAsValidator,
          validatorTotalSubmissions: vTotal,
          validatorReputationScore: vScore,
        },
      });
    }
  }

  console.log(`   Total: ${totalFeedbackCreated} feedback records across ${allResearchers.length} researchers x ${allValidators.length} validators`);

  // =============================================
  // Phase H: New Payment Types (WS3)
  // =============================================
  console.log('\n8. Creating new payment type records...');

  const newPayments = [
    {
      requestType: 'SCAN_REQUEST_FEE' as const,
      requesterAddress: RESEARCHER_WALLET.toLowerCase(),
      amount: BigInt(10000000), // $10 USDC
      status: 'COMPLETED' as const,
      recipientAddress: '0x0000000000000000000000000000000000000000',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      completedAt: new Date(),
    },
    {
      requestType: 'EXPLOIT_SUBMISSION_FEE' as const,
      requesterAddress: RESEARCHER_WALLET.toLowerCase(),
      amount: BigInt(5000000), // $5 USDC
      status: 'COMPLETED' as const,
      recipientAddress: VALIDATOR_WALLET.toLowerCase(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      completedAt: new Date(Date.now() - 1800000),
    },
    {
      requestType: 'SCAN_REQUEST_FEE' as const,
      requesterAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
      amount: BigInt(10000000),
      status: 'PENDING' as const,
      recipientAddress: null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      completedAt: null,
    },
  ];

  for (const payment of newPayments) {
    const p = await prisma.x402PaymentRequest.create({ data: payment });
    console.log(`   ${payment.requestType} - ${payment.status}: ${p.id}`);
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
  console.log(`Agent-Protocol associations: ${demoProtocol ? 2 : 0}`);
  console.log(`Bidirectional feedback: ${totalFeedbackCreated} records across all agent pairs`);
  console.log(`X.402 payments: 6 (3 original + 3 new types)`);
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
