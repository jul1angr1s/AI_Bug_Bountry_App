-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "processedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_status_processedAt_idx" ON "Payment"("status", "processedAt");
