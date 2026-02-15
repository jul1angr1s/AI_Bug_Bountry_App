-- Repair protocol versioning schema drift in environments where Protocol was created
-- before versioned registration fields were introduced.

DO $$
BEGIN
  CREATE TYPE "RegistrationType" AS ENUM ('INITIAL', 'DELTA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Protocol" ADD COLUMN IF NOT EXISTS "version" INTEGER;
ALTER TABLE "Protocol" ADD COLUMN IF NOT EXISTS "registrationType" "RegistrationType";
ALTER TABLE "Protocol" ADD COLUMN IF NOT EXISTS "parentProtocolId" TEXT;

-- Backfill deterministic version per githubUrl.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "githubUrl" ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "Protocol"
)
UPDATE "Protocol" p
SET "version" = ranked.rn
FROM ranked
WHERE p."id" = ranked."id"
  AND (p."version" IS NULL OR p."version" < 1);

UPDATE "Protocol"
SET "registrationType" = CASE
  WHEN "version" = 1 THEN 'INITIAL'::"RegistrationType"
  ELSE 'DELTA'::"RegistrationType"
END
WHERE "registrationType" IS NULL;

WITH roots AS (
  SELECT "githubUrl", "id" AS root_id
  FROM "Protocol"
  WHERE "version" = 1
)
UPDATE "Protocol" p
SET "parentProtocolId" = roots.root_id
FROM roots
WHERE p."githubUrl" = roots."githubUrl"
  AND p."version" > 1
  AND p."parentProtocolId" IS NULL;

UPDATE "Protocol" SET "version" = 1 WHERE "version" IS NULL;
UPDATE "Protocol" SET "registrationType" = 'INITIAL'::"RegistrationType" WHERE "registrationType" IS NULL;

ALTER TABLE "Protocol" ALTER COLUMN "version" SET DEFAULT 1;
ALTER TABLE "Protocol" ALTER COLUMN "version" SET NOT NULL;

ALTER TABLE "Protocol" ALTER COLUMN "registrationType" SET DEFAULT 'INITIAL';
ALTER TABLE "Protocol" ALTER COLUMN "registrationType" SET NOT NULL;

DROP INDEX IF EXISTS "Protocol_githubUrl_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Protocol_githubUrl_version_key" ON "Protocol"("githubUrl", "version");

CREATE INDEX IF NOT EXISTS "Protocol_parentProtocolId_idx" ON "Protocol"("parentProtocolId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Protocol_parentProtocolId_fkey'
  ) THEN
    ALTER TABLE "Protocol"
      ADD CONSTRAINT "Protocol_parentProtocolId_fkey"
      FOREIGN KEY ("parentProtocolId")
      REFERENCES "Protocol"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
