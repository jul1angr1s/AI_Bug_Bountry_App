-- Repair migration: add Protocol funding-gate columns expected by schema/code.
-- Safe to run multiple times in production.

ALTER TABLE "Protocol" ADD COLUMN IF NOT EXISTS "bountyPoolAmount" DOUBLE PRECISION;
ALTER TABLE "Protocol" ADD COLUMN IF NOT EXISTS "fundingState" TEXT;
ALTER TABLE "Protocol" ADD COLUMN IF NOT EXISTS "fundingTxHash" TEXT;
ALTER TABLE "Protocol" ADD COLUMN IF NOT EXISTS "fundingVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Protocol" ADD COLUMN IF NOT EXISTS "minimumBountyRequired" DOUBLE PRECISION;

-- Backfill and enforce default for minimum required bounty
UPDATE "Protocol"
SET "minimumBountyRequired" = 25
WHERE "minimumBountyRequired" IS NULL;

ALTER TABLE "Protocol" ALTER COLUMN "minimumBountyRequired" SET DEFAULT 25;
ALTER TABLE "Protocol" ALTER COLUMN "minimumBountyRequired" SET NOT NULL;
