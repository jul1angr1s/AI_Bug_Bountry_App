-- Stream B: precision-safe monetary persistence
ALTER TABLE "Protocol"
  ALTER COLUMN "totalBountyPool" TYPE DECIMAL(20,6) USING "totalBountyPool"::DECIMAL(20,6),
  ALTER COLUMN "availableBounty" TYPE DECIMAL(20,6) USING "availableBounty"::DECIMAL(20,6),
  ALTER COLUMN "paidBounty" TYPE DECIMAL(20,6) USING "paidBounty"::DECIMAL(20,6),
  ALTER COLUMN "bountyPoolAmount" TYPE DECIMAL(20,6) USING "bountyPoolAmount"::DECIMAL(20,6),
  ALTER COLUMN "minimumBountyRequired" TYPE DECIMAL(20,6) USING "minimumBountyRequired"::DECIMAL(20,6);

ALTER TABLE "Vulnerability"
  ALTER COLUMN "bounty" TYPE DECIMAL(20,6) USING "bounty"::DECIMAL(20,6);

ALTER TABLE "Payment"
  ALTER COLUMN "amount" TYPE DECIMAL(20,6) USING "amount"::DECIMAL(20,6);

ALTER TABLE "FundingEvent"
  ALTER COLUMN "amount" TYPE DECIMAL(20,6) USING "amount"::DECIMAL(20,6);

ALTER TABLE "PaymentReconciliation"
  ALTER COLUMN "amount" TYPE DECIMAL(20,6) USING "amount"::DECIMAL(20,6);
