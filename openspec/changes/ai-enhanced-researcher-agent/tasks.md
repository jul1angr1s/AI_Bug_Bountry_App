## 1. Infrastructure Setup

- [ ] 1.1 Add AI analysis dependencies to `backend/package.json` (faiss-node, @xenova/transformers, solidity-parser-antlr, p-queue, bottleneck, zod)
- [ ] 1.2 Create directory structure: `backend/src/agents/researcher/ai/`
- [ ] 1.3 Create knowledge base directories: `backend/knowledge_base/{consensys,swc,solidity-docs,exploits}`
- [ ] 1.4 Create FAISS index directory: `backend/faiss_index/`
- [ ] 1.5 Add environment variables to `backend/src/config/env.ts` (AI_ANALYSIS_ENABLED, AI_CONCURRENCY_LIMIT, AI_RATE_LIMIT_RPM, KNOWLEDGE_BASE_TOP_K)
- [ ] 1.6 Update `.env.example` with new AI configuration variables

## 2. Database Schema Migration

- [ ] 2.1 Create Prisma migration for `Finding` table additions (aiConfidenceScore, remediationSuggestion, codeSnippet, analysisMethod)
- [ ] 2.2 Add `AnalysisMethod` enum to Prisma schema (STATIC, AI, HYBRID)
- [ ] 2.3 Create `KnowledgeDocument` model in Prisma schema with indexes
- [ ] 2.4 Add `AI_DEEP_ANALYSIS` to `ScanStep` enum in Prisma schema
- [ ] 2.5 Run migration in dev environment: `npx prisma migrate dev --name add-ai-analysis-fields`
- [ ] 2.6 Generate Prisma client: `npx prisma generate`
- [ ] 2.7 Test rollback migration to ensure schema is reversible

## 3. Knowledge Base Management Implementation

- [ ] 3.1 Implement `backend/src/agents/researcher/ai/embeddings.ts` (local embedding generation with Transformers.js)
- [ ] 3.2 Implement `backend/src/agents/researcher/ai/knowledge-base.ts` (FAISS index creation, versioning, similarity search)
- [ ] 3.3 Create knowledge base builder script: `backend/src/scripts/build-knowledge-base.ts`
- [ ] 3.4 Add npm script to `package.json`: `"kb:build": "tsx src/scripts/build-knowledge-base.ts"`
- [ ] 3.5 Seed initial knowledge base: Download 5 ConsenSys best practices markdown files to `knowledge_base/consensys/`
- [ ] 3.6 Seed SWC registry: Add 20 common SWC weakness markdown files to `knowledge_base/swc/`
- [ ] 3.7 Add Solidity security docs to `knowledge_base/solidity-docs/`
- [ ] 3.8 Run initial knowledge base build: `npm run kb:build`
- [ ] 3.9 Verify FAISS index created at `backend/faiss_index/index.faiss`

## 4. Function Decomposition Implementation

- [ ] 4.1 Implement `backend/src/agents/researcher/ai/function-parser.ts` (Solidity AST parsing with solidity-parser-antlr)
- [ ] 4.2 Add function extraction logic (parse contracts to extract functions with metadata)
- [ ] 4.3 Add function context assembly (state variables, modifiers, events, called functions)
- [ ] 4.4 Add function signature generation (deterministic hash for caching)
- [ ] 4.5 Add function categorization logic (HIGH_RISK, MEDIUM_RISK, LOW_RISK based on characteristics)
- [ ] 4.6 Add cross-function dependency tracking (internal call graph construction)
- [ ] 4.7 Add error handling for malformed Solidity code (graceful degradation)

## 5. LLM Analyzer Implementation

- [ ] 5.1 Implement `backend/src/agents/researcher/ai/llm-analyzer.ts` (Kimi AI integration)
- [ ] 5.2 Add rate limiting with bottleneck (token bucket for Kimi API)
- [ ] 5.3 Add concurrency control with p-queue (max 3 concurrent requests)
- [ ] 5.4 Implement structured prompt template for vulnerability analysis
- [ ] 5.5 Add Zod schema for LLM response validation
- [ ] 5.6 Add LLM response sanitization (prevent XSS, SQL injection in outputs)
- [ ] 5.7 Implement Redis cache for function analysis results (key: signature hash + KB version)
- [ ] 5.8 Add exponential backoff retry logic for API failures
- [ ] 5.9 Add circuit breaker pattern (disable after 5 consecutive failures)

## 6. Enhanced Reporting Implementation

- [ ] 6.1 Implement `backend/src/agents/researcher/ai/report-generator.ts`
- [ ] 6.2 Add remediation guidance generation (code examples, best practice references)
- [ ] 6.3 Add code snippet extraction with line numbers
- [ ] 6.4 Add severity scoring logic with justification
- [ ] 6.5 Add confidence score explanation (hybrid calculation)
- [ ] 6.6 Add related vulnerability linking (duplicate detection)
- [ ] 6.7 Add historical context enrichment (CVE, SWC cross-referencing)

## 7. AI Deep Analysis Step Implementation

- [ ] 7.1 Create `backend/src/agents/researcher/steps/ai-deep-analysis.ts`
- [ ] 7.2 Add step logic: Load compiled contract, parse functions, analyze with LLM
- [ ] 7.3 Add integration with knowledge base for pattern retrieval
- [ ] 7.4 Add parallel function processing (up to 3 concurrent)
- [ ] 7.5 Add finding deduplication and merging with Slither findings
- [ ] 7.6 Add confidence score aggregation (weighted average of static + AI)
- [ ] 7.7 Add error handling with graceful degradation (fall back to Slither-only)
- [ ] 7.8 Add progress tracking and WebSocket events for frontend
- [ ] 7.9 Add metrics collection (LLM calls, cache hits, response time, token usage)

## 8. Worker Pipeline Integration

- [ ] 8.1 Update `backend/src/agents/researcher/worker.ts` to include AI_DEEP_ANALYSIS step
- [ ] 8.2 Add feature flag check: Skip AI step if `AI_ANALYSIS_ENABLED=false`
- [ ] 8.3 Update step progress percentages (7 steps instead of 6)
- [ ] 8.4 Add AI step error handling (mark scan as failed with AI_ANALYSIS_FAILED code)
- [ ] 8.5 Update ScanStepRecord creation to track AI_DEEP_ANALYSIS step
- [ ] 8.6 Add AI metrics to scan completion record

## 9. API Endpoints

- [ ] 9.1 Create admin endpoint: `POST /api/admin/knowledge-base/rebuild` in `backend/src/routes/admin.ts`
- [ ] 9.2 Add authentication middleware for admin endpoint (require admin role)
- [ ] 9.3 Update `GET /api/scans/:id/findings` to include AI metadata fields in response
- [ ] 9.4 Add query parameter support: `?analysisMethod=AI|STATIC|HYBRID` for filtering
- [ ] 9.5 Update API response types in `backend/src/types/api.ts`

## 10. Unit Tests for AI Components (NEW - Isolated)

- [ ] 10.1 Create `backend/src/agents/researcher/ai/__tests__/embeddings.test.ts` (test local embedding generation)
- [ ] 10.2 Create `backend/src/agents/researcher/ai/__tests__/knowledge-base.ai.test.ts` (test FAISS index, similarity search)
- [ ] 10.3 Create `backend/src/agents/researcher/ai/__tests__/function-parser.ai.test.ts` (test Solidity parsing with sample contracts)
- [ ] 10.4 Create `backend/src/agents/researcher/ai/__tests__/llm-analyzer.ai.test.ts` (test with mocked Kimi API responses)
- [ ] 10.5 Create `backend/src/agents/researcher/ai/__tests__/report-generator.ai.test.ts` (test report formatting with snapshots)
- [ ] 10.6 Add test fixtures: Sample Solidity contracts in `__tests__/fixtures/contracts/`
- [ ] 10.7 Add test fixtures: Mock LLM responses in `__tests__/fixtures/llm-responses.json`

## 11. Step Tests for AI Deep Analysis (NEW - Isolated)

- [ ] 11.1 Create `backend/src/agents/researcher/steps/__tests__/ai-deep-analysis.test.ts`
- [ ] 11.2 Add test: AI step with mocked LLM validates Slither findings
- [ ] 11.3 Add test: AI step detects additional vulnerabilities not in Slither
- [ ] 11.4 Add test: AI step handles parse errors gracefully
- [ ] 11.5 Add test: AI step respects rate limits and queues functions
- [ ] 11.6 Add test: AI step falls back to Slither-only on LLM failure
- [ ] 11.7 Add test: AI step caching works for duplicate function signatures

## 12. Integration Tests (NEW - Isolated)

- [ ] 12.1 Create `backend/src/agents/researcher/__tests__/integration/ai-pipeline.ai.test.ts`
- [ ] 12.2 Add test: Full 7-step pipeline with AI enabled (mocked LLM)
- [ ] 12.3 Add test: Pipeline skips AI step when `AI_ANALYSIS_ENABLED=false`
- [ ] 12.4 Add test: Knowledge base rebuild endpoint works correctly
- [ ] 12.5 Add test: API returns AI findings with all metadata fields
- [ ] 12.6 Add test: Cache invalidation on knowledge base version change

## 13. Verify Existing E2E Tests (CRITICAL - No Changes)

- [ ] 13.1 Run existing E2E tests with `AI_ANALYSIS_ENABLED=false`: `npm run test:e2e`
- [ ] 13.2 Verify all existing tests pass (100% success rate required)
- [ ] 13.3 Confirm NO modifications were made to existing test files
- [ ] 13.4 Verify existing 6-step pipeline still works without AI

## 14. CI/CD Configuration

- [ ] 14.1 Add Jest project configuration for AI tests in `jest.config.js`
- [ ] 14.2 Create npm script: `"test:ai": "AI_ANALYSIS_ENABLED=true jest --testMatch='**/*.ai.test.ts'"`
- [ ] 14.3 Update `.github/workflows/test.yml` to run existing E2E tests first
- [ ] 14.4 Add AI test job to CI workflow (runs after E2E tests pass)
- [ ] 14.5 Add environment variable defaults: `AI_ANALYSIS_ENABLED=false` in test environment

## 15. Documentation

- [ ] 15.1 Create `backend/docs/AI_ANALYSIS.md` documenting AI analysis architecture
- [ ] 15.2 Create `backend/docs/KNOWLEDGE_BASE.md` documenting knowledge base management
- [ ] 15.3 Create `backend/docs/AI_TESTING.md` documenting AI test patterns and mocking strategies
- [ ] 15.4 Update `backend/README.md` with AI feature flag usage
- [ ] 15.5 Add JSDoc comments to all AI module public functions
- [ ] 15.6 Update OpenAPI/Swagger spec with new AI fields in Finding schema

## 16. Manual Testing

- [ ] 16.1 Test with OpenZeppelin ERC20 (safe baseline, should find no issues)
- [ ] 16.2 Test with Ethernaut reentrancy challenge (should detect vulnerability with high confidence)
- [ ] 16.3 Test with Ethernaut delegatecall challenge (should detect delegatecall vulnerability)
- [ ] 16.4 Test knowledge base rebuild endpoint with new document
- [ ] 16.5 Verify cache hit on duplicate function analysis (check logs)
- [ ] 16.6 Test rate limiting by analyzing contract with 50+ functions
- [ ] 16.7 Test graceful degradation: Disable Kimi API, verify fallback to Slither-only

## 17. Performance Optimization

- [ ] 17.1 Profile AI analysis step with typical contract (20 functions)
- [ ] 17.2 Verify total scan time <5 minutes for average contract
- [ ] 17.3 Optimize prompt token count to <2000 tokens per function
- [ ] 17.4 Add database indexes on `Finding.analysisMethod` and `Finding.aiConfidenceScore`
- [ ] 17.5 Monitor Redis memory usage for cache (set alerts for >1GB)

## 18. Monitoring and Observability

- [ ] 18.1 Add logging for AI step start/complete with duration
- [ ] 18.2 Add metrics: AI step duration, LLM API calls, cache hit rate, error rate
- [ ] 18.3 Add alert: AI error rate >5%
- [ ] 18.4 Add alert: AI step duration >2 minutes
- [ ] 18.5 Add dashboard: Track AI usage, costs, performance over time

## 19. Staging Deployment

- [ ] 19.1 Deploy to staging with `AI_ANALYSIS_ENABLED=false`
- [ ] 19.2 Run database migration in staging
- [ ] 19.3 Build and upload knowledge base to staging environment
- [ ] 19.4 Enable AI analysis in staging: Set `AI_ANALYSIS_ENABLED=true`
- [ ] 19.5 Run 10 test scans, compare results with production (Slither-only)
- [ ] 19.6 Verify no errors in logs, all metrics within expected ranges

## 20. Production Rollout (Canary)

- [ ] 20.1 Deploy to production with `AI_ANALYSIS_ENABLED=false` initially
- [ ] 20.2 Run database migration in production (zero-downtime, nullable fields)
- [ ] 20.3 Build and upload knowledge base to production environment
- [ ] 20.4 Enable AI for 10% of scans (canary): Modify worker.ts to enable randomly
- [ ] 20.5 Monitor for 48 hours: Error rate, scan time, user feedback
- [ ] 20.6 If metrics good, increase to 50% of scans
- [ ] 20.7 Monitor for 1 week at 50%
- [ ] 20.8 Full rollout: Set `AI_ANALYSIS_ENABLED=true` globally

## 21. Post-Deployment Validation

- [ ] 21.1 Run comparison: 50 scans AI-enabled vs. 50 scans Slither-only
- [ ] 21.2 Calculate false positive reduction percentage (target: >30%)
- [ ] 21.3 Verify cache hit rate >30% after 1 week
- [ ] 21.4 Review AI-generated remediation quality (manual review of 20 findings)
- [ ] 21.5 Collect user feedback on finding quality and usefulness
- [ ] 21.6 Create retrospective document: Lessons learned, future improvements
