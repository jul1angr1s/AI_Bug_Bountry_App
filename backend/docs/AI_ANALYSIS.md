# AI Analysis System Architecture

## Overview

The AI Analysis System enhances the vulnerability research pipeline by using Claude AI (Anthropic) to perform deep semantic analysis of smart contracts. It augments traditional static analysis tools (like Slither) with AI-powered insights that can discover subtle vulnerabilities, provide enhanced descriptions, and offer remediation suggestions.

## System Architecture

The AI analysis system is integrated as **Step 5** in the 7-step research pipeline:

```
1. CLONE              → Clone repository from GitHub
2. COMPILE            → Compile Solidity contracts with Foundry
3. DEPLOY             → Deploy contracts to local Anvil testnet
4. ANALYZE            → Run Slither static analysis
5. AI_DEEP_ANALYSIS   → AI-enhanced vulnerability analysis ⭐
6. PROOF_GENERATION   → Generate cryptographic proofs
7. SUBMIT             → Submit findings to Validator Agent
```

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Research Pipeline                      │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   Slither Static Analysis     │
        │   (Step 4: ANALYZE)           │
        └───────────┬───────────────────┘
                    │
                    │ VulnerabilityFinding[]
                    ▼
        ┌───────────────────────────────┐
        │   AI Deep Analysis            │
        │   (Step 5: AI_DEEP_ANALYSIS)  │
        └───────────┬───────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐     ┌──────────────────┐
│  Function     │     │  Knowledge Base  │
│  Parser       │     │  Search          │
└───────┬───────┘     └────────┬─────────┘
        │                      │
        │   Functions[]        │   Similar Exploits
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   LLM Analyzer       │
        │   (Kimi 2.5)│
        └──────────┬───────────┘
                   │
                   │ AI-Enhanced Findings
                   ▼
        ┌──────────────────────┐
        │   Report Generator   │
        └──────────┬───────────┘
                   │
                   ▼
        Enhanced VulnerabilityFinding[]
```

## Core Components

### 1. AI Deep Analysis Orchestrator (`ai-deep-analysis.ts`)

**Purpose**: Main entry point that orchestrates the AI analysis workflow.

**Location**: `/backend/src/agents/researcher/steps/ai-deep-analysis.ts`

**Key Functions**:
- `executeAIDeepAnalysisStep()` - Main orchestration function
- Checks `AI_ANALYSIS_ENABLED` feature flag
- Coordinates between all AI components
- Handles error fallback to Slither findings
- Returns enhanced findings with metrics

**Input**:
```typescript
interface AIDeepAnalysisParams {
  clonedPath: string;           // Path to cloned repository
  contractPath: string;         // Path to target contract
  contractName: string;         // Name of contract
  slitherFindings: VulnerabilityFinding[];
}
```

**Output**:
```typescript
interface AIDeepAnalysisResult {
  findings: VulnerabilityFinding[];
  metrics: AIAnalysisMetrics;
  aiEnhanced: boolean;
}
```

### 2. Function Parser

**Purpose**: Extracts function signatures and implementations from Solidity contracts for focused analysis.

**Planned Location**: `/backend/src/agents/researcher/ai/function-parser.ts`

**Responsibilities**:
- Parse Solidity source code
- Extract function definitions with line numbers
- Identify function modifiers and visibility
- Extract function bodies for context
- Map findings to specific functions

**Key Data Structures**:
```typescript
interface ParsedFunction {
  name: string;
  signature: string;
  visibility: 'public' | 'external' | 'internal' | 'private';
  modifiers: string[];
  lineStart: number;
  lineEnd: number;
  code: string;
}
```

### 3. Knowledge Base Manager

**Purpose**: Manages the vulnerability knowledge base for RAG (Retrieval Augmented Generation).

**Planned Location**: `/backend/src/agents/researcher/ai/knowledge-base.ts`

**Responsibilities**:
- Load vulnerability documents from `/backend/knowledge_base/`
- Generate embeddings for documents
- Store documents in PostgreSQL (`KnowledgeDocument` table)
- Perform semantic search for relevant exploits
- Version management and cache invalidation

**Database Schema**:
```prisma
model KnowledgeDocument {
  id        String    @id @default(uuid())
  source    String                 // File path or URL
  title     String                 // Document title
  content   String    @db.Text     // Full document content
  embedding Json                   // Vector embedding
  severity  Severity?              // Associated severity
  tags      String[]               // Classification tags
  version   Int                    // KB version number
  createdAt DateTime  @default(now())
}
```

### 4. Embeddings Service

**Purpose**: Generate and manage vector embeddings for semantic search.

**Planned Location**: `/backend/src/agents/researcher/ai/embeddings.ts`

**Responsibilities**:
- Generate embeddings using Anthropic's API
- Calculate cosine similarity for search
- Cache embeddings to reduce API calls
- Batch processing for efficiency

**Key Functions**:
```typescript
async function generateEmbedding(text: string): Promise<number[]>
async function findSimilarDocuments(
  query: string,
  topK: number
): Promise<KnowledgeDocument[]>
```

### 5. LLM Analyzer

**Purpose**: Interfaces with Claude API to perform AI-powered vulnerability analysis.

**Planned Location**: `/backend/src/agents/researcher/ai/llm-analyzer.ts`

**Responsibilities**:
- Construct optimized prompts for vulnerability analysis
- Call Claude Sonnet 4.5 API
- Parse structured responses
- Handle rate limiting and retries
- Track token usage and costs

**Prompt Structure**:
```
SYSTEM: You are a smart contract security expert...

CONTEXT:
- Contract: {contractName}
- Function: {functionName}
- Static Analysis Findings: {slitherFindings}

KNOWLEDGE BASE:
{relevantExploits}

CONTRACT CODE:
{contractSource}

TASK: Analyze for vulnerabilities and provide:
1. Enhanced descriptions
2. Severity assessment
3. Exploitation scenarios
4. Remediation suggestions
```

### 6. Report Generator

**Purpose**: Formats AI analysis results into structured vulnerability findings.

**Planned Location**: `/backend/src/agents/researcher/ai/report-generator.ts`

**Responsibilities**:
- Convert LLM responses to `VulnerabilityFinding` objects
- Validate and sanitize AI outputs
- Merge enhanced findings with Slither findings
- Calculate confidence scores
- Generate code snippets

**Output Enhancement**:
```typescript
interface VulnerabilityFinding {
  // Standard fields (from Slither)
  vulnerabilityType: string;
  severity: Severity;
  filePath: string;
  lineNumber: number;
  description: string;
  confidenceScore: number;

  // AI-enhanced fields (Phase 4)
  analysisMethod?: 'STATIC' | 'AI' | 'HYBRID';
  aiConfidenceScore?: number;
  remediationSuggestion?: string;
  codeSnippet?: string;
}
```

## Data Flow

### Detailed Analysis Flow

```
1. Input: Slither Findings
   ├─ vulnerabilityType: "REENTRANCY"
   ├─ severity: "HIGH"
   ├─ description: "Reentrancy in withdraw function"
   └─ lineNumber: 42

2. Function Parser
   ├─ Read contract source
   ├─ Locate function at line 42
   └─ Extract: withdraw() function code

3. Knowledge Base Search
   ├─ Generate embedding for "reentrancy withdraw"
   ├─ Search similar exploits
   └─ Return: Top 3 reentrancy exploit examples

4. LLM Analyzer
   ├─ Build prompt with context:
   │  ├─ Original finding
   │  ├─ Function code
   │  └─ Similar exploits
   ├─ Call Claude API
   └─ Parse response

5. Report Generator
   ├─ Validate AI response
   ├─ Enhance original finding:
   │  ├─ analysisMethod: "AI"
   │  ├─ aiConfidenceScore: 0.95
   │  ├─ remediationSuggestion: "Use ReentrancyGuard..."
   │  └─ codeSnippet: "function withdraw() { ... }"
   └─ Output: Enhanced Finding

6. Output: Enhanced Findings + Metrics
   ├─ findings: VulnerabilityFinding[]
   └─ metrics: {
       totalFindings: 4,
       enhancedFindings: 2,
       newFindings: 2,
       processingTimeMs: 1500,
       modelUsed: "claude-sonnet-4-5",
       tokensUsed: 3500
   }
```

## Configuration

### Environment Variables

```bash
# Feature Flag
AI_ANALYSIS_ENABLED=true          # Enable/disable AI analysis

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-...      # API key for Claude
ANTHROPIC_MODEL=claude-sonnet-4-5  # Model to use
ANTHROPIC_MAX_TOKENS=4096         # Max response tokens
ANTHROPIC_TEMPERATURE=0.1         # Low temp for consistency

# Rate Limiting
AI_MAX_REQUESTS_PER_MINUTE=50     # Rate limit
AI_TIMEOUT_MS=30000               # Request timeout

# Knowledge Base
KB_VERSION=v1                      # Current KB version
KB_REBUILD_ON_STARTUP=false       # Auto-rebuild KB
KB_EMBEDDINGS_BATCH_SIZE=10       # Batch size for embeddings

# Caching
AI_CACHE_TTL=3600                 # Cache TTL in seconds
AI_CACHE_ENABLED=true             # Enable response caching
```

### Configuration File

Create `/backend/src/agents/researcher/ai/config.ts`:

```typescript
export const AI_CONFIG = {
  enabled: process.env.AI_ANALYSIS_ENABLED === 'true',

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
    maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096'),
    temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE || '0.1'),
  },

  rateLimit: {
    maxRequestsPerMinute: parseInt(process.env.AI_MAX_REQUESTS_PER_MINUTE || '50'),
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '30000'),
  },

  knowledgeBase: {
    version: process.env.KB_VERSION || 'v1',
    rebuildOnStartup: process.env.KB_REBUILD_ON_STARTUP === 'true',
    embeddingsBatchSize: parseInt(process.env.KB_EMBEDDINGS_BATCH_SIZE || '10'),
    topK: 5, // Number of similar documents to retrieve
  },

  cache: {
    enabled: process.env.AI_CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.AI_CACHE_TTL || '3600'),
  },
};
```

## Usage Examples

### Basic Usage (Pipeline Integration)

The AI analysis is automatically invoked as part of the research pipeline:

```typescript
// In researcher agent worker
import { executeAIDeepAnalysisStep } from './steps/ai-deep-analysis.js';

// Step 4: Analyze (Slither)
const slitherFindings = await executeAnalyzeStep({ ... });

// Step 5: AI Deep Analysis
const aiResult = await executeAIDeepAnalysisStep({
  clonedPath: '/tmp/repo-clone',
  contractPath: 'contracts/Token.sol',
  contractName: 'Token',
  slitherFindings,
});

// Use enhanced findings
console.log(`AI enhanced ${aiResult.metrics.enhancedFindings} findings`);
console.log(`AI discovered ${aiResult.metrics.newFindings} new findings`);
```

### Standalone Analysis

For testing or manual analysis:

```typescript
import { executeAIDeepAnalysisStep } from './steps/ai-deep-analysis.js';

const result = await executeAIDeepAnalysisStep({
  clonedPath: '/path/to/repo',
  contractPath: 'contracts/MyContract.sol',
  contractName: 'MyContract',
  slitherFindings: [
    {
      vulnerabilityType: 'REENTRANCY',
      severity: 'HIGH',
      filePath: 'contracts/MyContract.sol',
      lineNumber: 42,
      description: 'Reentrancy in withdraw',
      confidenceScore: 0.8,
      analysisMethod: 'STATIC',
    }
  ],
});

// Access enhanced findings
result.findings.forEach(finding => {
  console.log(`Type: ${finding.vulnerabilityType}`);
  console.log(`Severity: ${finding.severity}`);
  console.log(`Method: ${finding.analysisMethod}`);
  console.log(`AI Confidence: ${finding.aiConfidenceScore}`);
  console.log(`Remediation: ${finding.remediationSuggestion}`);
  console.log('---');
});
```

### Feature Flag Toggle

Disable AI analysis without code changes:

```bash
# .env
AI_ANALYSIS_ENABLED=false
```

When disabled, the system returns original Slither findings immediately:

```typescript
const result = await executeAIDeepAnalysisStep({ ... });
// result.aiEnhanced === false
// result.findings === slitherFindings (unchanged)
// result.metrics.modelUsed === 'none'
```

### Knowledge Base Rebuild

Rebuild the knowledge base after adding new documents:

```bash
# API endpoint
curl -X POST http://localhost:3000/api/admin/knowledge-base/rebuild \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Response:
```json
{
  "success": true,
  "version": "v2",
  "documentCount": 150,
  "message": "Knowledge base rebuilt successfully",
  "rebuiltAt": "2025-02-01T12:00:00.000Z"
}
```

## Performance Considerations

### Caching Strategy

1. **Response Caching**: Cache AI analysis results by contract hash
2. **Embedding Caching**: Cache document embeddings
3. **Knowledge Base Versioning**: Invalidate caches on KB version change

### Cost Optimization

1. **Batch Processing**: Process multiple findings in single API call
2. **Selective Analysis**: Only analyze HIGH/CRITICAL Slither findings with AI
3. **Response Caching**: Avoid re-analyzing identical code
4. **Token Optimization**: Minimize prompt size by focusing on relevant code sections

### Monitoring

Track these metrics:

```typescript
interface AIAnalysisMetrics {
  totalFindings: number;
  enhancedFindings: number;
  newFindings: number;
  processingTimeMs: number;
  modelUsed: string;
  tokensUsed?: number;
}
```

Log to monitoring service:
- Average processing time per finding
- Token usage and estimated cost
- Cache hit rate
- Error rate and fallback frequency

## Error Handling

The system is designed for graceful degradation:

```typescript
try {
  // Attempt AI analysis
  const aiResult = await analyzeWithAI(...);
  return aiResult;
} catch (error) {
  console.error('AI analysis failed:', error);

  // Fallback to Slither findings
  return {
    findings: slitherFindings,
    metrics: {
      totalFindings: slitherFindings.length,
      enhancedFindings: 0,
      newFindings: 0,
      processingTimeMs: Date.now() - startTime,
      modelUsed: 'error',
    },
    aiEnhanced: false,
  };
}
```

**Error Scenarios**:
- API key invalid/missing → Fallback to Slither
- Rate limit exceeded → Queue for retry
- Timeout → Fallback to Slither
- Invalid response → Fallback to Slither
- Network error → Fallback to Slither

## Security Considerations

1. **API Key Protection**: Store `ANTHROPIC_API_KEY` securely, never commit to git
2. **Input Validation**: Sanitize contract code before sending to LLM
3. **Output Validation**: Validate and sanitize LLM responses
4. **Rate Limiting**: Prevent API abuse with request limits
5. **Audit Logging**: Log all AI analysis requests for audit trail
6. **Data Privacy**: Never send sensitive data (private keys, secrets) to LLM

## Testing

See [AI_TESTING.md](./AI_TESTING.md) for comprehensive testing documentation.

Quick test:

```bash
# Run AI pipeline tests
npm run test:ai

# Test with AI disabled
AI_ANALYSIS_ENABLED=false npm test

# Test with AI enabled (requires API key)
AI_ANALYSIS_ENABLED=true npm test
```

## Future Enhancements

1. **Multi-Model Support**: Support for GPT-4, Gemini, etc.
2. **Custom Training**: Fine-tune models on vulnerability datasets
3. **Interactive Analysis**: Allow researchers to query specific concerns
4. **Automated Remediation**: Generate fix suggestions as pull requests
5. **Continuous Learning**: Feed validation results back to improve accuracy

## References

- [Anthropic Claude API Docs](https://docs.anthropic.com/claude/reference)
- [Slither Documentation](https://github.com/crytic/slither)
- [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md) - Knowledge base management
- [AI_TESTING.md](./AI_TESTING.md) - Testing patterns and strategies
