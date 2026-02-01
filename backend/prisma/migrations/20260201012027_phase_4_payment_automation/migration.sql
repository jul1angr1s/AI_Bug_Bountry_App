-- AlterTable Payment - Add Phase 4 payment automation fields
ALTER TABLE "Payment" ADD COLUMN "researcherAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN "reconciled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reconciledAt" TIMESTAMP(3),
ADD COLUMN "failureReason" TEXT,
ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "queuedAt" TIMESTAMP(3);

-- CreateTable PaymentReconciliation
CREATE TABLE "PaymentReconciliation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "onChainBountyId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "PaymentReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable EventListenerState
CREATE TABLE "EventListenerState" (
    "id" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "lastProcessedBlock" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventListenerState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_researcherAddress_idx" ON "Payment"("researcherAddress");

-- CreateIndex
CREATE INDEX "Payment_reconciled_idx" ON "Payment"("reconciled");

-- CreateIndex
CREATE INDEX "PaymentReconciliation_status_idx" ON "PaymentReconciliation"("status");

-- CreateIndex
CREATE INDEX "PaymentReconciliation_onChainBountyId_idx" ON "PaymentReconciliation"("onChainBountyId");

-- CreateIndex
CREATE UNIQUE INDEX "EventListenerState_contractAddress_eventName_key" ON "EventListenerState"("contractAddress", "eventName");

-- AddForeignKey
ALTER TABLE "PaymentReconciliation" ADD CONSTRAINT "PaymentReconciliation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
