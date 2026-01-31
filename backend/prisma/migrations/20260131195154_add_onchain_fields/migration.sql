-- CreateEnum
CREATE TYPE "ProtocolStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- CreateEnum
CREATE TYPE "VulnerabilityStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('PROTOCOL', 'RESEARCHER', 'VALIDATOR');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ONLINE', 'OFFLINE', 'SCANNING', 'ERROR');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ScanState" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ScanStep" AS ENUM ('CLONE', 'COMPILE', 'DEPLOY', 'ANALYZE', 'PROOF_GENERATION', 'SUBMIT');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "ProofStatus" AS ENUM ('ENCRYPTED', 'SUBMITTED', 'VALIDATED', 'REJECTED');

-- CreateTable
CREATE TABLE "Protocol" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "githubUrl" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "contractPath" TEXT NOT NULL,
    "contractName" TEXT NOT NULL,
    "bountyTerms" TEXT NOT NULL,
    "status" "ProtocolStatus" NOT NULL DEFAULT 'PENDING',
    "riskScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "registrationState" TEXT,
    "registrationTxHash" TEXT,
    "failureReason" TEXT,
    "fundedAt" TIMESTAMP(3),
    "totalBountyPool" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "availableBounty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidBounty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "onChainProtocolId" TEXT,

    CONSTRAINT "Protocol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vulnerability" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "vulnerabilityHash" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "status" "VulnerabilityStatus" NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bounty" DOUBLE PRECISION,
    "proof" TEXT,

    CONSTRAINT "Vulnerability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "type" "AgentType" NOT NULL,
    "status" "AgentStatus" NOT NULL,
    "currentTask" TEXT,
    "taskProgress" DOUBLE PRECISION,
    "lastHeartbeat" TIMESTAMP(3),
    "uptime" INTEGER,
    "scansCompleted" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "agentId" TEXT,
    "state" "ScanState" NOT NULL DEFAULT 'QUEUED',
    "currentStep" "ScanStep",
    "targetBranch" TEXT,
    "targetCommitHash" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "vulnerabilitiesFound" INTEGER NOT NULL DEFAULT 0,
    "findingsCount" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "vulnerabilityType" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "status" "FindingStatus" NOT NULL DEFAULT 'PENDING',
    "filePath" TEXT NOT NULL,
    "lineNumber" INTEGER,
    "functionSelector" TEXT,
    "description" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" TIMESTAMP(3),

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proof" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "findingId" TEXT,
    "status" "ProofStatus" NOT NULL DEFAULT 'ENCRYPTED',
    "encryptedPayload" TEXT NOT NULL,
    "ipfsCid" TEXT,
    "storageUrl" TEXT,
    "researcherSignature" TEXT NOT NULL,
    "validatorPublicKey" TEXT,
    "encryptionKeyId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" TIMESTAMP(3),
    "onChainValidationId" TEXT,
    "onChainTxHash" TEXT,

    CONSTRAINT "Proof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanStepRecord" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "step" "ScanStep" NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ScanStepRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "scanId" TEXT,
    "runtimeVersion" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "stackTrace" TEXT,
    "memoryUsage" INTEGER,
    "cpuUsage" DOUBLE PRECISION,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "vulnerabilityId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "txHash" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "onChainBountyId" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "txHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingEvent" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "txHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "FundingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Protocol_githubUrl_key" ON "Protocol"("githubUrl");

-- CreateIndex
CREATE INDEX "Protocol_ownerAddress_idx" ON "Protocol"("ownerAddress");

-- CreateIndex
CREATE INDEX "Protocol_registrationState_idx" ON "Protocol"("registrationState");

-- CreateIndex
CREATE INDEX "Protocol_githubUrl_idx" ON "Protocol"("githubUrl");

-- CreateIndex
CREATE INDEX "Vulnerability_protocolId_discoveredAt_idx" ON "Vulnerability"("protocolId", "discoveredAt");

-- CreateIndex
CREATE INDEX "Agent_lastHeartbeat_idx" ON "Agent"("lastHeartbeat");

-- CreateIndex
CREATE INDEX "Scan_protocolId_state_idx" ON "Scan"("protocolId", "state");

-- CreateIndex
CREATE INDEX "Scan_state_startedAt_idx" ON "Scan"("state", "startedAt");

-- CreateIndex
CREATE INDEX "Scan_agentId_idx" ON "Scan"("agentId");

-- CreateIndex
CREATE INDEX "Finding_scanId_idx" ON "Finding"("scanId");

-- CreateIndex
CREATE INDEX "Finding_status_idx" ON "Finding"("status");

-- CreateIndex
CREATE INDEX "Finding_severity_idx" ON "Finding"("severity");

-- CreateIndex
CREATE INDEX "Proof_scanId_status_idx" ON "Proof"("scanId", "status");

-- CreateIndex
CREATE INDEX "Proof_findingId_idx" ON "Proof"("findingId");

-- CreateIndex
CREATE INDEX "ScanStepRecord_scanId_step_idx" ON "ScanStepRecord"("scanId", "step");

-- CreateIndex
CREATE INDEX "ScanStepRecord_status_idx" ON "ScanStepRecord"("status");

-- CreateIndex
CREATE INDEX "AgentRun_agentId_startedAt_idx" ON "AgentRun"("agentId", "startedAt");

-- CreateIndex
CREATE INDEX "AgentRun_scanId_idx" ON "AgentRun"("scanId");

-- CreateIndex
CREATE INDEX "AgentRun_errorCode_idx" ON "AgentRun"("errorCode");

-- CreateIndex
CREATE INDEX "AuditLog_protocolId_idx" ON "AuditLog"("protocolId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "FundingEvent_protocolId_idx" ON "FundingEvent"("protocolId");

-- CreateIndex
CREATE INDEX "FundingEvent_createdAt_idx" ON "FundingEvent"("createdAt");

-- CreateIndex
CREATE INDEX "FundingEvent_status_idx" ON "FundingEvent"("status");

-- AddForeignKey
ALTER TABLE "Vulnerability" ADD CONSTRAINT "Vulnerability_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "Protocol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "Protocol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proof" ADD CONSTRAINT "Proof_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proof" ADD CONSTRAINT "Proof_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanStepRecord" ADD CONSTRAINT "ScanStepRecord_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "Vulnerability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "Protocol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingEvent" ADD CONSTRAINT "FundingEvent_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "Protocol"("id") ON DELETE CASCADE ON UPDATE CASCADE;
