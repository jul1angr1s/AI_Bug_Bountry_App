-- AlterEnum ScanStep - Add AI_DEEP_ANALYSIS step
ALTER TYPE "ScanStep" ADD VALUE 'AI_DEEP_ANALYSIS';

-- CreateEnum AnalysisMethod
CREATE TYPE "AnalysisMethod" AS ENUM ('STATIC', 'AI', 'HYBRID');

-- AlterTable Finding - Add AI analysis fields
ALTER TABLE "Finding" ADD COLUMN "aiConfidenceScore" DOUBLE PRECISION,
ADD COLUMN "remediationSuggestion" TEXT,
ADD COLUMN "codeSnippet" TEXT,
ADD COLUMN "analysisMethod" "AnalysisMethod";

-- CreateTable KnowledgeDocument
CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" JSONB NOT NULL,
    "severity" "Severity",
    "tags" TEXT[],
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeDocument_source_version_idx" ON "KnowledgeDocument"("source", "version");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_tags_idx" ON "KnowledgeDocument"("tags");
