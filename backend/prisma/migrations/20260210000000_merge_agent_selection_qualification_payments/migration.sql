-- Merge migration: agent-selection + mutual-qualification + payment-redesign
-- These changes may already exist in the database (applied via direct schema push).
-- This migration ensures the migration history matches the schema.

-- WS1: Agent Selection - ProtocolAgentAssociation model
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

-- WS2: Mutual Qualification - Validator reputation fields on AgentReputation
ALTER TABLE "AgentReputation" ADD COLUMN IF NOT EXISTS "validatorConfirmedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AgentReputation" ADD COLUMN IF NOT EXISTS "validatorRejectedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AgentReputation" ADD COLUMN IF NOT EXISTS "validatorTotalSubmissions" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AgentReputation" ADD COLUMN IF NOT EXISTS "validatorReputationScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AgentReputation" ADD COLUMN IF NOT EXISTS "validatorLastUpdated" TIMESTAMP(3);

-- WS2: FeedbackDirection enum and field
DO $$ BEGIN
    CREATE TYPE "FeedbackDirection" AS ENUM ('VALIDATOR_RATES_RESEARCHER', 'RESEARCHER_RATES_VALIDATOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "AgentFeedback" ADD COLUMN IF NOT EXISTS "feedbackDirection" "FeedbackDirection" NOT NULL DEFAULT 'VALIDATOR_RATES_RESEARCHER';
CREATE INDEX IF NOT EXISTS "AgentFeedback_feedbackDirection_idx" ON "AgentFeedback"("feedbackDirection");

-- WS3: Payment Redesign - New enum values for X402RequestType
ALTER TYPE "X402RequestType" ADD VALUE IF NOT EXISTS 'SCAN_REQUEST_FEE';
ALTER TYPE "X402RequestType" ADD VALUE IF NOT EXISTS 'EXPLOIT_SUBMISSION_FEE';

-- WS3: recipientAddress field on X402PaymentRequest
ALTER TABLE "X402PaymentRequest" ADD COLUMN IF NOT EXISTS "recipientAddress" TEXT;
CREATE INDEX IF NOT EXISTS "X402PaymentRequest_requestType_idx" ON "X402PaymentRequest"("requestType");
