## Context

The current Researcher Agent uses a 6-step pipeline (CLONE → COMPILE → DEPLOY → ANALYZE → PROOF_GENERATION → SUBMIT) with Slither as the sole static analysis tool. While effective for pattern-based detection, this approach:
- Generates false positives requiring manual triage
- Misses context-dependent vulnerabilities
- Lacks actionable remediation guidance
- Cannot learn from validated exploits

This design introduces AI-powered deep analysis using RAG (Retrieval-Augmented Generation) techniques, inspired by the ai-smart-contract-auditor reference implementation, while maintaining full backward compatibility with existing infrastructure.

**Current State:**
- Researcher Agent processes ~2 scans concurrently via BullMQ
- Findings stored in PostgreSQL with basic metadata (type, severity, confidence, description)
- Existing E2E tests validate the full 6-step pipeline
- Kimi AI (k.25) already integrated for MCP agents

**Constraints:**
- MUST NOT break existing E2E tests
- MUST maintain backward compatibility with Slither-only mode
- MUST respect Kimi AI rate limits (existing provider)
- MUST isolate AI analysis failures to prevent pipeline disruption
- MUST keep scan times reasonable (<5 min for typical contracts)

## Goals / Non-Goals

**Goals:**
- Add AI-powered vulnerability analysis using RAG + Kimi AI k.25
- Reduce false positive rate by 30-50% through LLM validation
- Generate actionable remediation guidance for all findings
- Build extensible knowledge base from security best practices and validated exploits
- Maintain <5 minute total scan time for contracts with <20 functions
- Enable/disable AI analysis via feature flag for gradual rollout
- Provide isolated test suite for AI components without affecting existing tests

**Non-Goals:**
- Replace Slither (hybrid approach, not replacement)
- Support non-Solidity languages in Phase 1
- Real-time learning during scans (knowledge base updated offline)
- Frontend UI changes (API returns enhanced data, UI updates separately)
- Custom LLM fine-tuning (use Kimi k.25 as-is)
- Multi-chain analysis differences (same logic for all EVM chains)

## Decisions

### Decision 1: RAG Architecture with FAISS + Kimi AI

**Choice:** Use FAISS for local vector storage + Kimi AI for LLM inference

**Rationale:**
- FAISS is battle-tested, supports ~200MB knowledge base efficiently
- No external vector DB dependency (Pinecone, Weaviate) = lower operational complexity
- Kimi AI k.25 already integrated, no new provider onboarding
- In-process embedding generation avoids API costs (use open-source model like `all-MiniLM-L6-v2`)

**Alternatives Considered:**
- ❌ Pinecone/Weaviate: Adds external dependency, monthly cost, network latency
- ❌ OpenAI embeddings: High cost for large knowledge bases (~$0.10/1M tokens)
- ❌ LangChain Cloud: Over-engineered for our use case

**Implementation:**
```
backend/src/agents/researcher/ai/
├── knowledge-base.ts        # FAISS index management
├── embeddings.ts            # Local embedding generation (Transformers.js)
├── llm-analyzer.ts          # Kimi AI integration
├── function-parser.ts       # Solidity AST parsing
└── report-generator.ts      # Vulnerability report formatting
```

---

### Decision 2: 7-Step Pipeline with Isolated AI Step

**Choice:** Insert AI_DEEP_ANALYSIS as step 5 between ANALYZE and PROOF_GENERATION

**Rationale:**
- Slither runs first, findings guide AI focus areas (progressive enhancement)
- AI step is isolated - failure doesn't lose Slither findings
- Existing steps unchanged = backward compatibility maintained
- Easy to disable via feature flag for testing/rollback

**Pipeline Flow:**
```
1. CLONE          (existing, unchanged)
2. COMPILE        (existing, unchanged)
3. DEPLOY         (existing, unchanged)
4. ANALYZE        (existing Slither, unchanged)
5. AI_DEEP_ANALYSIS (NEW - AI validation + enhancement)
6. PROOF_GENERATION (existing, enhanced with AI findings)
7. SUBMIT         (existing, unchanged)
```

**Feature Flag:**
```typescript
// .env
AI_ANALYSIS_ENABLED=true  // false disables step 5, reverts to 6-step pipeline
```

**Alternatives Considered:**
- ❌ Replace ANALYZE with AI: Loses fast Slither feedback, risky migration
- ❌ Run AI in parallel with Slither: Complex synchronization, harder to debug
- ❌ Post-process after SUBMIT: Too late for validator to use enhanced findings

---

### Decision 3: Function-Level Analysis with Signature-Based Caching

**Choice:** Parse contracts into functions, analyze each with LLM, cache by function signature hash

**Rationale:**
- Function-level granularity provides precise context to LLM (vs. whole-file)
- Identical functions across contracts reuse cached results (30-40% cache hit rate expected)
- Parallel processing of independent functions optimizes total time
- Signature hash (SHA256 of normalized function) is deterministic cache key

**Cache Strategy:**
```typescript
// Redis cache
Key: `ai-analysis:${functionSignatureHash}:${knowledgeBaseVersion}`
Value: { findings, confidence, remediation, timestamp }
TTL: 30 days (invalidated on knowledge base rebuild)
```

**Alternatives Considered:**
- ❌ Whole-file analysis: Poor LLM context window utilization, no caching
- ❌ Contract-level analysis: Less precise, harder to parallelize
- ❌ No caching: Wasteful API calls, slow scans for common patterns

---

### Decision 4: Database Schema Extensions (Additive Only)

**Choice:** Add nullable columns to existing `Finding` table + new `KnowledgeDocument` table

**Rationale:**
- Nullable columns maintain backward compatibility (existing queries unaffected)
- Single table for findings simplifies queries (no joins for AI metadata)
- New `KnowledgeDocument` table isolated from core schema
- Prisma migrations auto-generated, rollback-safe

**Schema Changes:**
```prisma
model Finding {
  // Existing fields (unchanged)
  id                  String   @id @default(uuid())
  scanId              String
  vulnerabilityType   String
  severity            Severity
  filePath            String
  description         String
  confidenceScore     Float

  // NEW fields (nullable for backward compatibility)
  aiConfidenceScore      Float?          // AI-specific confidence
  remediationSuggestion  String?         // Markdown-formatted guidance
  codeSnippet            String?         // Vulnerable code extract
  analysisMethod         AnalysisMethod? // STATIC | AI | HYBRID

  // Relations unchanged
  scan     Scan     @relation(fields: [scanId])
  proofs   Proof[]
}

enum AnalysisMethod {
  STATIC
  AI
  HYBRID
}

model KnowledgeDocument {
  id          String   @id @default(uuid())
  source      String   // "consensys", "swc", "exploit"
  title       String
  content     String   @db.Text
  embedding   Json     // Vector embedding (JSON array)
  severity    Severity?
  tags        String[] // ["reentrancy", "defi", "erc20"]
  version     Int      // Knowledge base version
  createdAt   DateTime @default(now())

  @@index([source, version])
  @@index([tags])
}

model ScanStepRecord {
  // Add AI_DEEP_ANALYSIS to existing step enum
  step  ScanStep  // CLONE|COMPILE|DEPLOY|ANALYZE|AI_DEEP_ANALYSIS|PROOF_GENERATION|SUBMIT
}
```

**Migration Safety:**
- All new fields nullable = zero-downtime deployment
- Default `analysisMethod = null` for pre-AI findings
- Queries can filter: `WHERE analysisMethod IS NOT NULL` for AI-enhanced only

**Alternatives Considered:**
- ❌ Separate `AIFinding` table: Requires complex joins, harder to query
- ❌ JSON column for AI metadata: Loses type safety, can't index
- ❌ Denormalize everything: Violates DRY, hard to maintain

---

### Decision 5: Knowledge Base Management Strategy

**Choice:** Offline indexing with manual rebuild endpoint, no real-time updates during scans

**Rationale:**
- FAISS index rebuild is expensive (~30s for 500 docs), shouldn't block scans
- Manual rebuild gives control over knowledge base quality/versioning
- Validated exploits added in batches (not per-scan) for review
- Version tracking ensures reproducible analysis results

**Knowledge Base Structure:**
```
backend/knowledge_base/
├── consensys/               # ConsenSys best practices (markdown)
│   ├── reentrancy.md
│   ├── access-control.md
│   └── ...
├── swc/                     # Smart Contract Weakness Classification
│   ├── SWC-107-reentrancy.md
│   └── ...
├── solidity-docs/           # Official Solidity security docs
│   └── ...
└── exploits/                # Sanitized validated exploits (auto-added)
    └── exploit-{id}.md

backend/faiss_index/
├── index.faiss              # FAISS vector index
└── metadata.json            # Document IDs, version, timestamp
```

**Rebuild Workflow:**
1. Admin adds/updates markdown files in `knowledge_base/`
2. POST `/api/admin/knowledge-base/rebuild` triggers:
   - Parse all markdown files
   - Generate embeddings (batched, local Transformers.js)
   - Build FAISS index
   - Increment version, save metadata
   - Invalidate Redis cache (new version)
3. Subsequent scans use new knowledge base version

**Alternatives Considered:**
- ❌ Real-time updates: Too slow, complicates concurrency
- ❌ Cloud vector DB: External dependency, cost, latency
- ❌ Per-scan knowledge base: Inconsistent results, no versioning

---

### Decision 6: Parallel Function Analysis with Rate Limiting

**Choice:** Process up to 3 functions concurrently with token bucket rate limiter for Kimi AI

**Rationale:**
- Kimi AI rate limits: ~100 RPM (exact limit TBD, configurable)
- 3 concurrent = sweet spot for speed vs. rate limit risk
- Token bucket allows burst usage with gradual refill
- Exponential backoff on 429 errors prevents cascade failures

**Concurrency Control:**
```typescript
// backend/src/agents/researcher/ai/llm-analyzer.ts
const CONCURRENCY_LIMIT = 3;  // Configurable via env
const RATE_LIMIT_RPM = 100;    // Tokens per minute
const RATE_LIMIT_BURST = 10;   // Max burst tokens

// p-queue for concurrency + bottleneck for rate limiting
import PQueue from 'p-queue';
import Bottleneck from 'bottleneck';

const queue = new PQueue({ concurrency: CONCURRENCY_LIMIT });
const limiter = new Bottleneck({
  reservoir: RATE_LIMIT_BURST,
  reservoirRefreshAmount: RATE_LIMIT_RPM,
  reservoirRefreshInterval: 60 * 1000, // 1 minute
});

async function analyzeFunction(fn: ParsedFunction): Promise<AIFinding[]> {
  return queue.add(() => limiter.schedule(() => callKimiAPI(fn)));
}
```

**Alternatives Considered:**
- ❌ Sequential processing: Too slow (1 min for 20 functions)
- ❌ Unlimited concurrency: Guaranteed rate limit violations
- ❌ Higher concurrency (5+): Minimal speed gain, higher error risk

---

### Decision 7: Isolated Test Strategy

**Choice:** Create separate test suites for AI components, NEVER modify existing E2E tests

**Rationale:**
- Existing E2E tests validate Slither-only pipeline = regression safety
- AI tests isolated in new files with `ai.test.ts` suffix
- Feature flag disabled by default in test env = E2E tests unchanged
- Integration tests for AI components use mocked LLM responses

**Test Structure:**
```
backend/src/agents/researcher/__tests__/
├── worker.test.ts                    # EXISTING - unchanged
├── steps/
│   ├── clone.test.ts                 # EXISTING - unchanged
│   ├── compile.test.ts               # EXISTING - unchanged
│   ├── analyze.test.ts               # EXISTING - unchanged
│   └── ai-deep-analysis.test.ts      # NEW - AI step tests
├── ai/
│   ├── knowledge-base.ai.test.ts     # NEW - KB management tests
│   ├── function-parser.ai.test.ts    # NEW - Parser tests
│   ├── llm-analyzer.ai.test.ts       # NEW - Mocked LLM tests
│   └── report-generator.ai.test.ts   # NEW - Report formatting tests
└── integration/
    └── ai-pipeline.ai.test.ts        # NEW - End-to-end AI tests
```

**Test Isolation Rules:**
1. **NEVER** add AI assertions to existing test files
2. **NEVER** enable `AI_ANALYSIS_ENABLED=true` in default test env
3. AI tests run in separate Jest project with explicit flag
4. Use `jest.mock()` for Kimi AI SDK in all AI tests
5. CI runs existing tests first (fail fast), AI tests second

**CI Configuration:**
```yaml
# .github/workflows/test.yml
- name: Run Existing E2E Tests
  run: npm run test:e2e  # AI_ANALYSIS_ENABLED=false (default)

- name: Run AI Component Tests
  run: npm run test:ai    # AI_ANALYSIS_ENABLED=true, mocked LLM
```

**Alternatives Considered:**
- ❌ Modify existing tests with conditionals: Fragile, hard to maintain
- ❌ Single test suite for both: Risk of accidental E2E breakage
- ❌ Feature branch for tests: Merging conflicts, divergence risk

---

### Decision 8: LLM Prompt Design for Vulnerability Analysis

**Choice:** Structured prompt with function context + retrieved patterns + JSON schema output

**Rationale:**
- Kimi AI k.25 supports structured JSON output (reduces parsing errors)
- Few-shot examples in prompt improve consistency
- Explicit JSON schema ensures type safety
- Retrieved patterns provide domain expertise context

**Prompt Template:**
```typescript
const prompt = `You are a smart contract security auditor analyzing Solidity code.

FUNCTION TO ANALYZE:
\`\`\`solidity
${functionCode}
\`\`\`

CONTRACT CONTEXT:
- State Variables: ${stateVars}
- Modifiers: ${modifiers}
- Called Functions: ${calledFunctions}

RETRIEVED SECURITY PATTERNS:
${retrievedPatterns.map(p => `- ${p.title}: ${p.summary}`).join('\n')}

STATIC ANALYSIS FINDINGS:
${slitherFindings.map(f => `- ${f.type}: ${f.description}`).join('\n')}

TASK: Analyze this function for vulnerabilities. For each vulnerability:
1. Validate if Slither findings are true positives
2. Identify any additional vulnerabilities not caught by Slither
3. Provide severity (CRITICAL|HIGH|MEDIUM|LOW|INFO)
4. Suggest specific remediation with code examples

OUTPUT FORMAT (JSON):
{
  "findings": [
    {
      "type": "REENTRANCY",
      "isSlitherValidated": true,
      "severity": "CRITICAL",
      "confidence": 0.9,
      "description": "...",
      "remediationSteps": ["...", "..."],
      "codeExample": "..."
    }
  ]
}`;
```

**Output Validation:**
```typescript
const AIFindingSchema = z.object({
  findings: z.array(z.object({
    type: z.string(),
    isSlitherValidated: z.boolean(),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']),
    confidence: z.number().min(0).max(1),
    description: z.string(),
    remediationSteps: z.array(z.string()),
    codeExample: z.string().optional(),
  })),
});
```

**Alternatives Considered:**
- ❌ Free-form text output: Requires fragile regex parsing
- ❌ Separate prompt per vulnerability type: Too many API calls
- ❌ Zero-shot (no examples): Lower consistency, more errors

## Risks / Trade-offs

### Risk 1: LLM API Costs and Latency
**Risk:** Kimi AI costs could scale unpredictably; latency adds scan time
**Impact:** Budget overruns; user complaints about slow scans
**Mitigation:**
- Implement aggressive caching (30-day TTL, signature-based)
- Monitor token usage per scan, alert on anomalies
- Feature flag allows instant disable if costs spike
- Optimize prompts to reduce token count (target <2k tokens/function)
- Consider batch API requests if Kimi supports (10 functions = 1 call)

---

### Risk 2: Knowledge Base Quality and Bias
**Risk:** Poor-quality or outdated security patterns lead to wrong guidance
**Impact:** False negatives (missed vulnerabilities); false positives
**Mitigation:**
- Curate initial knowledge base from authoritative sources only (ConsenSys, OpenZeppelin, SWC)
- Version knowledge base, track which version produced each finding
- Manual review process before adding validated exploits
- A/B test: Run scans with/without AI, compare results
- Regularly audit knowledge base for outdated content (quarterly review)

---

### Risk 3: Backward Compatibility Breakage
**Risk:** Schema changes or code refactoring breaks existing features
**Impact:** E2E test failures; production bugs
**Mitigation:**
- All new DB fields nullable (no NOT NULL constraints)
- Feature flag defaults to `false` in production (gradual rollout)
- Isolated test suites (existing tests NEVER touch AI code)
- Canary deployment: Enable AI for 10% of scans initially
- Rollback plan: Flip feature flag, revert Prisma migration if needed

---

### Risk 4: Rate Limiting and API Failures
**Risk:** Kimi AI rate limits hit during high load; API downtime
**Impact:** Scans fail or timeout; degraded user experience
**Mitigation:**
- Token bucket rate limiter with exponential backoff
- Graceful degradation: AI step fails → fall back to Slither-only
- Circuit breaker: After 5 consecutive AI failures, disable for 10 min
- Queue scans during rate limit violations (retry later)
- Monitor API error rates, alert on >5% error rate

---

### Risk 5: Test Maintenance Burden
**Risk:** AI tests require mocking complex LLM responses; brittle over time
**Impact:** Test flakiness; developer frustration
**Mitigation:**
- Record real LLM responses as fixtures (update quarterly)
- Use snapshot testing for LLM outputs (Jest snapshots)
- Keep mocks simple: focus on schema validation, not exact text
- Separate unit tests (mocked) from integration tests (real API, dev env only)
- Document test patterns in `AI_TESTING.md`

---

### Risk 6: Function Parser Edge Cases
**Risk:** Solidity parser fails on complex syntax (assembly, meta-programming)
**Impact:** Functions skipped; incomplete analysis
**Mitigation:**
- Use battle-tested parser library (`solidity-parser-antlr`, 1M+ downloads)
- Graceful error handling: log parse failures, continue with other functions
- Track parse success rate metric (alert if <90%)
- Manual review of parse failures (report to user in scan metadata)
- Fallback: If parser fails, send whole file to LLM (slower but complete)

## Migration Plan

### Phase 1: Infrastructure Setup (Week 1)
1. Add dependencies to `package.json`:
   ```bash
   npm install faiss-node @xenova/transformers solidity-parser-antlr zod
   npm install -D @types/node
   ```
2. Create knowledge base structure:
   ```bash
   mkdir -p backend/knowledge_base/{consensys,swc,solidity-docs,exploits}
   mkdir -p backend/faiss_index
   ```
3. Seed initial knowledge base:
   - Download ConsenSys best practices (5 markdown files)
   - Scrape SWC registry (20 common weaknesses)
   - Add Solidity security considerations docs
4. Run initial FAISS index build:
   ```bash
   npm run kb:build  # New script
   ```

### Phase 2: Database Schema Migration (Week 1)
1. Create Prisma migration:
   ```bash
   npx prisma migrate dev --name add-ai-analysis-fields
   ```
2. Verify migration in dev environment (PostgreSQL)
3. Test rollback:
   ```bash
   npx prisma migrate dev --name rollback-ai-fields
   ```
4. Apply to staging environment, validate queries

### Phase 3: AI Components Implementation (Week 2-3)
1. Implement in order (TDD approach):
   - `embeddings.ts` → Unit tests with fixtures
   - `knowledge-base.ts` → Unit + integration tests
   - `function-parser.ts` → Unit tests with Solidity samples
   - `llm-analyzer.ts` → Unit tests with mocked Kimi API
   - `report-generator.ts` → Unit tests with snapshot testing
2. Add new step `ai-deep-analysis.ts`
3. Update `worker.ts` to include AI step (behind feature flag)
4. Update `env.ts` with new config vars:
   ```typescript
   AI_ANALYSIS_ENABLED: z.boolean().default(false),
   AI_CONCURRENCY_LIMIT: z.number().default(3),
   AI_RATE_LIMIT_RPM: z.number().default(100),
   KNOWLEDGE_BASE_TOP_K: z.number().default(5),
   ```

### Phase 4: Testing (Week 4)
1. Run existing E2E tests (must pass 100%):
   ```bash
   npm run test:e2e  # AI_ANALYSIS_ENABLED=false
   ```
2. Run new AI test suite:
   ```bash
   npm run test:ai   # AI_ANALYSIS_ENABLED=true, mocked
   ```
3. Manual testing with real contracts:
   - OpenZeppelin ERC20 (safe baseline)
   - Known vulnerable contracts from Ethernaut
   - Recent audit reports from Code4rena

### Phase 5: Staged Rollout (Week 5-6)
1. **Dev environment:** Enable `AI_ANALYSIS_ENABLED=true`, monitor logs
2. **Staging environment:** Enable for all scans, compare with prod (Slither-only)
3. **Production canary:** Enable for 10% of scans (random selection):
   ```typescript
   const enableAI = Math.random() < 0.1 && config.AI_ANALYSIS_ENABLED;
   ```
4. **Production 50%:** If metrics good (error rate <5%, scan time <5min), increase to 50%
5. **Production 100%:** Full rollout after 1 week of stable 50%

### Rollback Strategy
**If critical issues found:**
1. **Immediate:** Set `AI_ANALYSIS_ENABLED=false` in env vars (no deployment needed)
2. **If schema issues:** Revert Prisma migration:
   ```bash
   npx prisma migrate dev --name revert-ai-fields
   ```
3. **If code issues:** Git revert merge commit, redeploy previous version
4. **Data cleanup:** AI-generated findings preserved (nullable fields), no data loss

### Success Metrics
- **Scan time:** AI step adds <60s for average contract (20 functions)
- **False positive reduction:** 30% fewer false positives vs. Slither-only (manual review of 50 scans)
- **Coverage:** AI validates 100% of Slither findings
- **Error rate:** <5% AI step failures
- **Cache hit rate:** >30% for common patterns (ERC20, ERC721)
- **Test coverage:** >80% for AI components

## Open Questions

1. **Q:** Should AI analysis run on contracts with 0 Slither findings?
   **Status:** TBD - Likely yes for completeness, but low priority queue
   **Owner:** Product team decision needed

2. **Q:** How to handle Solidity versions <0.8.0 (pre-auto-revert)?
   **Status:** TBD - Parser supports, but LLM prompt may need version-specific examples
   **Owner:** Security team review needed

3. **Q:** Should knowledge base updates trigger re-analysis of past scans?
   **Status:** TBD - Expensive, but valuable for historical accuracy
   **Owner:** Architecture review in Phase 2

4. **Q:** What's the exact Kimi AI k.25 rate limit?
   **Status:** BLOCKED - Need to confirm with Kimi API docs or support
   **Owner:** DevOps to test and document

5. **Q:** Should we expose AI confidence scores in public API?
   **Status:** TBD - May confuse users; consider internal-only initially
   **Owner:** Product/API design review

6. **Q:** How to handle multi-file contracts (imports, libraries)?
   **Status:** TBD - Current design uses single-file context; may need dependency resolution
   **Owner:** Technical spike in Week 2
