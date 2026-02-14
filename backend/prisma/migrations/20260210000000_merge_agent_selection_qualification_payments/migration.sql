-- Merge migration: agent-selection + mutual-qualification + payment-redesign
-- Also creates ERC-8004 Agent Identity and x.402 models that were previously
-- applied via prisma db push but never captured in migrations.

-- ============================================================================
-- Step 1: Create missing enum types
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE "AgentIdentityType" AS ENUM ('RESEARCHER', 'VALIDATOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FeedbackType" AS ENUM ('CONFIRMED_CRITICAL', 'CONFIRMED_HIGH', 'CONFIRMED_MEDIUM', 'CONFIRMED_LOW', 'CONFIRMED_INFORMATIONAL', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FeedbackDirection" AS ENUM ('VALIDATOR_RATES_RESEARCHER', 'RESEARCHER_RATES_VALIDATOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "X402RequestType" AS ENUM ('PROTOCOL_REGISTRATION', 'FINDING_SUBMISSION', 'SCAN_REQUEST_FEE', 'EXPLOIT_SUBMISSION_FEE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "X402PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "EscrowTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'SUBMISSION_FEE', 'PROTOCOL_FEE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- Step 2: Create missing tables (ERC-8004 Agent Identity & x.402 Payment)
-- ============================================================================

-- AgentIdentity
CREATE TABLE IF NOT EXISTS "AgentIdentity" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "agentNftId" BIGINT,
    "agentType" "AgentIdentityType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "onChainTxHash" TEXT,

    CONSTRAINT "AgentIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentIdentity_walletAddress_key" ON "AgentIdentity"("walletAddress");
CREATE INDEX IF NOT EXISTS "AgentIdentity_walletAddress_idx" ON "AgentIdentity"("walletAddress");
CREATE INDEX IF NOT EXISTS "AgentIdentity_agentType_idx" ON "AgentIdentity"("agentType");
CREATE INDEX IF NOT EXISTS "AgentIdentity_agentNftId_idx" ON "AgentIdentity"("agentNftId");

-- AgentReputation
CREATE TABLE IF NOT EXISTS "AgentReputation" (
    "id" TEXT NOT NULL,
    "agentIdentityId" TEXT NOT NULL,
    "confirmedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "inconclusiveCount" INTEGER NOT NULL DEFAULT 0,
    "totalSubmissions" INTEGER NOT NULL DEFAULT 0,
    "reputationScore" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatorConfirmedCount" INTEGER NOT NULL DEFAULT 0,
    "validatorRejectedCount" INTEGER NOT NULL DEFAULT 0,
    "validatorTotalSubmissions" INTEGER NOT NULL DEFAULT 0,
    "validatorReputationScore" INTEGER NOT NULL DEFAULT 0,
    "validatorLastUpdated" TIMESTAMP(3),

    CONSTRAINT "AgentReputation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentReputation_agentIdentityId_key" ON "AgentReputation"("agentIdentityId");
CREATE INDEX IF NOT EXISTS "AgentReputation_reputationScore_idx" ON "AgentReputation"("reputationScore");
CREATE INDEX IF NOT EXISTS "AgentReputation_totalSubmissions_idx" ON "AgentReputation"("totalSubmissions");

ALTER TABLE "AgentReputation" DROP CONSTRAINT IF EXISTS "AgentReputation_agentIdentityId_fkey";
ALTER TABLE "AgentReputation" ADD CONSTRAINT "AgentReputation_agentIdentityId_fkey" FOREIGN KEY ("agentIdentityId") REFERENCES "AgentIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AgentFeedback
CREATE TABLE IF NOT EXISTS "AgentFeedback" (
    "id" TEXT NOT NULL,
    "researcherAgentId" TEXT NOT NULL,
    "validatorAgentId" TEXT NOT NULL,
    "validationId" TEXT,
    "findingId" TEXT,
    "feedbackType" "FeedbackType" NOT NULL,
    "feedbackDirection" "FeedbackDirection" NOT NULL DEFAULT 'VALIDATOR_RATES_RESEARCHER',
    "onChainFeedbackId" TEXT,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AgentFeedback_researcherAgentId_idx" ON "AgentFeedback"("researcherAgentId");
CREATE INDEX IF NOT EXISTS "AgentFeedback_validatorAgentId_idx" ON "AgentFeedback"("validatorAgentId");
CREATE INDEX IF NOT EXISTS "AgentFeedback_feedbackType_idx" ON "AgentFeedback"("feedbackType");
CREATE INDEX IF NOT EXISTS "AgentFeedback_feedbackDirection_idx" ON "AgentFeedback"("feedbackDirection");

ALTER TABLE "AgentFeedback" DROP CONSTRAINT IF EXISTS "AgentFeedback_researcherAgentId_fkey";
ALTER TABLE "AgentFeedback" ADD CONSTRAINT "AgentFeedback_researcherAgentId_fkey" FOREIGN KEY ("researcherAgentId") REFERENCES "AgentIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentFeedback" DROP CONSTRAINT IF EXISTS "AgentFeedback_validatorAgentId_fkey";
ALTER TABLE "AgentFeedback" ADD CONSTRAINT "AgentFeedback_validatorAgentId_fkey" FOREIGN KEY ("validatorAgentId") REFERENCES "AgentIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AgentEscrow
CREATE TABLE IF NOT EXISTS "AgentEscrow" (
    "id" TEXT NOT NULL,
    "agentIdentityId" TEXT NOT NULL,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "totalDeposited" BIGINT NOT NULL DEFAULT 0,
    "totalDeducted" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentEscrow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentEscrow_agentIdentityId_key" ON "AgentEscrow"("agentIdentityId");
CREATE INDEX IF NOT EXISTS "AgentEscrow_balance_idx" ON "AgentEscrow"("balance");

ALTER TABLE "AgentEscrow" DROP CONSTRAINT IF EXISTS "AgentEscrow_agentIdentityId_fkey";
ALTER TABLE "AgentEscrow" ADD CONSTRAINT "AgentEscrow_agentIdentityId_fkey" FOREIGN KEY ("agentIdentityId") REFERENCES "AgentIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EscrowTransaction
CREATE TABLE IF NOT EXISTS "EscrowTransaction" (
    "id" TEXT NOT NULL,
    "agentEscrowId" TEXT NOT NULL,
    "transactionType" "EscrowTransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "txHash" TEXT,
    "findingId" TEXT,
    "protocolId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscrowTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EscrowTransaction_agentEscrowId_idx" ON "EscrowTransaction"("agentEscrowId");
CREATE INDEX IF NOT EXISTS "EscrowTransaction_transactionType_idx" ON "EscrowTransaction"("transactionType");
CREATE INDEX IF NOT EXISTS "EscrowTransaction_createdAt_idx" ON "EscrowTransaction"("createdAt");

ALTER TABLE "EscrowTransaction" DROP CONSTRAINT IF EXISTS "EscrowTransaction_agentEscrowId_fkey";
ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_agentEscrowId_fkey" FOREIGN KEY ("agentEscrowId") REFERENCES "AgentEscrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- X402PaymentRequest
CREATE TABLE IF NOT EXISTS "X402PaymentRequest" (
    "id" TEXT NOT NULL,
    "requestType" "X402RequestType" NOT NULL,
    "requesterAddress" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" "X402PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "protocolId" TEXT,
    "paymentReceipt" TEXT,
    "txHash" TEXT,
    "recipientAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "X402PaymentRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "X402PaymentRequest_requesterAddress_idx" ON "X402PaymentRequest"("requesterAddress");
CREATE INDEX IF NOT EXISTS "X402PaymentRequest_status_idx" ON "X402PaymentRequest"("status");
CREATE INDEX IF NOT EXISTS "X402PaymentRequest_protocolId_idx" ON "X402PaymentRequest"("protocolId");
CREATE INDEX IF NOT EXISTS "X402PaymentRequest_requestType_idx" ON "X402PaymentRequest"("requestType");

-- ============================================================================
-- Step 3: ProtocolAgentAssociation (agent selection feature)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "ProtocolAgentAssociation" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "agentIdentityId" TEXT NOT NULL,
    "role" "AgentIdentityType" NOT NULL,
    "associatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProtocolAgentAssociation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProtocolAgentAssociation_protocolId_role_key" ON "ProtocolAgentAssociation"("protocolId", "role");
CREATE INDEX IF NOT EXISTS "ProtocolAgentAssociation_protocolId_idx" ON "ProtocolAgentAssociation"("protocolId");
CREATE INDEX IF NOT EXISTS "ProtocolAgentAssociation_agentIdentityId_idx" ON "ProtocolAgentAssociation"("agentIdentityId");

ALTER TABLE "ProtocolAgentAssociation" DROP CONSTRAINT IF EXISTS "ProtocolAgentAssociation_protocolId_fkey";
ALTER TABLE "ProtocolAgentAssociation" ADD CONSTRAINT "ProtocolAgentAssociation_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "Protocol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProtocolAgentAssociation" DROP CONSTRAINT IF EXISTS "ProtocolAgentAssociation_agentIdentityId_fkey";
ALTER TABLE "ProtocolAgentAssociation" ADD CONSTRAINT "ProtocolAgentAssociation_agentIdentityId_fkey" FOREIGN KEY ("agentIdentityId") REFERENCES "AgentIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
