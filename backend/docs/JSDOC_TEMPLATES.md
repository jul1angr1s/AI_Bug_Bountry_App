# JSDoc Templates for AI Components

This document provides JSDoc templates for AI analysis components to ensure consistent, comprehensive documentation.

## General Guidelines

1. **Every public function must have JSDoc comments**
2. **Include @param for all parameters with descriptions**
3. **Include @returns with description and type**
4. **Include @throws for potential errors**
5. **Include @example showing real-world usage**
6. **Include @since version tag**
7. **Link related types with @see tags**

## Template: Embeddings Service

```typescript
/**
 * Generates vector embeddings for text using Anthropic's API
 *
 * Converts text into a high-dimensional vector representation (1536 dimensions)
 * suitable for semantic similarity search. Uses caching to avoid redundant API
 * calls for identical text.
 *
 * @param {string} text - Text to generate embedding for (max 8191 tokens)
 * @returns {Promise<number[]>} Vector embedding array (1536 float values)
 *
 * @throws {Error} If API key is invalid or missing
 * @throws {Error} If text exceeds token limit
 * @throws {Error} If API request fails or times out
 *
 * @example
 * ```typescript
 * const embedding = await generateEmbedding(
 *   'Reentrancy vulnerability in withdraw function'
 * );
 *
 * console.log(embedding.length); // 1536
 * console.log(embedding[0]); // 0.123456
 * ```
 *
 * @see {@link findSimilarDocuments} for using embeddings in search
 * @see {@link https://docs.anthropic.com/claude/reference|Anthropic API Docs}
 *
 * @since 4.0.0
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Implementation
}

/**
 * Finds documents semantically similar to the query text
 *
 * Performs vector similarity search using cosine similarity to find the most
 * relevant knowledge base documents for a given query. Results are sorted by
 * similarity score (highest first).
 *
 * @param {string} query - Search query text
 * @param {number} [topK=5] - Number of results to return (default: 5)
 * @param {number} [minSimilarity=0.7] - Minimum similarity threshold (0-1)
 * @returns {Promise<SimilarDocument[]>} Array of similar documents with scores
 *
 * @example
 * ```typescript
 * const results = await findSimilarDocuments(
 *   'reentrancy in withdrawal',
 *   5,
 *   0.8
 * );
 *
 * results.forEach(doc => {
 *   console.log(`${doc.title} (${doc.similarity})`);
 *   console.log(doc.content);
 * });
 * ```
 *
 * @see {@link generateEmbedding} for embedding generation
 *
 * @since 4.0.0
 */
export async function findSimilarDocuments(
  query: string,
  topK: number = 5,
  minSimilarity: number = 0.7
): Promise<SimilarDocument[]> {
  // Implementation
}

/**
 * Calculates cosine similarity between two embedding vectors
 *
 * Returns a value between -1 and 1, where:
 * - 1.0 = identical vectors
 * - 0.0 = orthogonal (unrelated)
 * - -1.0 = opposite vectors
 *
 * @param {number[]} embeddingA - First embedding vector
 * @param {number[]} embeddingB - Second embedding vector
 * @returns {number} Cosine similarity score (-1 to 1)
 *
 * @throws {Error} If vectors have different dimensions
 *
 * @example
 * ```typescript
 * const similarity = cosineSimilarity(embedding1, embedding2);
 *
 * if (similarity > 0.8) {
 *   console.log('Highly similar');
 * }
 * ```
 *
 * @since 4.0.0
 */
export function cosineSimilarity(
  embeddingA: number[],
  embeddingB: number[]
): number {
  // Implementation
}
```

## Template: Knowledge Base Manager

```typescript
/**
 * Rebuilds the knowledge base by processing all documents and generating embeddings
 *
 * This operation:
 * 1. Reads all markdown files from knowledge_base/exploits/
 * 2. Extracts metadata (severity, tags, title)
 * 3. Generates embeddings for each document
 * 4. Stores documents with new version number
 * 5. Invalidates all cached analyses
 *
 * @param {RebuildOptions} [options] - Rebuild configuration
 * @param {number} [options.version] - Version number to use (auto-increments if not provided)
 * @param {string} [options.sourcePath] - Path to knowledge base directory
 * @param {number} [options.batchSize=10] - Number of documents to process in parallel
 * @returns {Promise<RebuildResult>} Result with statistics
 *
 * @throws {Error} If source directory doesn't exist
 * @throws {Error} If API key is invalid
 *
 * @example
 * ```typescript
 * const result = await rebuildKnowledgeBase({
 *   version: 2,
 *   sourcePath: './knowledge_base/exploits',
 *   batchSize: 10,
 * });
 *
 * console.log(`Rebuilt KB v${result.version}`);
 * console.log(`Processed ${result.documentCount} documents`);
 * console.log(`Took ${result.processingTimeMs}ms`);
 * ```
 *
 * @see {@link getCurrentVersion} for version management
 *
 * @since 4.0.0
 */
export async function rebuildKnowledgeBase(
  options?: RebuildOptions
): Promise<RebuildResult> {
  // Implementation
}

/**
 * Gets the current active knowledge base version number
 *
 * @returns {Promise<number>} Current version number (e.g., 1, 2, 3)
 *
 * @example
 * ```typescript
 * const version = await getCurrentVersion();
 * console.log(`Current KB version: v${version}`);
 * ```
 *
 * @since 4.0.0
 */
export async function getCurrentVersion(): Promise<number> {
  // Implementation
}

/**
 * Searches the knowledge base for documents matching the query
 *
 * @param {SearchParams} params - Search parameters
 * @param {string} params.query - Search query text
 * @param {number} [params.topK] - Number of results to return
 * @param {SearchFilters} [params.filters] - Optional filters
 * @returns {Promise<KnowledgeDocument[]>} Matching documents
 *
 * @example
 * ```typescript
 * const results = await searchKnowledgeBase({
 *   query: 'reentrancy withdrawal',
 *   topK: 5,
 *   filters: {
 *     severity: ['CRITICAL', 'HIGH'],
 *     tags: ['reentrancy'],
 *   },
 * });
 * ```
 *
 * @see {@link findSimilarDocuments} for underlying search mechanism
 *
 * @since 4.0.0
 */
export async function searchKnowledgeBase(
  params: SearchParams
): Promise<KnowledgeDocument[]> {
  // Implementation
}
```

## Template: Function Parser

```typescript
/**
 * Parses a Solidity contract file and extracts all function definitions
 *
 * Uses @solidity-parser/parser to parse the AST and extract:
 * - Function signatures
 * - Visibility modifiers
 * - Function bodies
 * - Line numbers
 *
 * @param {string} contractPath - Absolute path to .sol file
 * @returns {Promise<ParsedFunction[]>} Array of parsed functions
 *
 * @throws {Error} If file doesn't exist
 * @throws {Error} If file is not valid Solidity
 * @throws {Error} If parsing fails
 *
 * @example
 * ```typescript
 * const functions = await parseSolidityFunctions(
 *   '/tmp/contracts/Token.sol'
 * );
 *
 * functions.forEach(fn => {
 *   console.log(`${fn.name} (${fn.visibility})`);
 *   console.log(`Lines ${fn.lineStart}-${fn.lineEnd}`);
 *   console.log(`Modifiers: ${fn.modifiers.join(', ')}`);
 * });
 * ```
 *
 * @see {@link ParsedFunction} for return type structure
 *
 * @since 4.0.0
 */
export async function parseSolidityFunctions(
  contractPath: string
): Promise<ParsedFunction[]> {
  // Implementation
}

/**
 * Extracts the source code for a specific function from a contract
 *
 * @param {string} contractPath - Path to contract file
 * @param {number} lineStart - Starting line number (1-indexed)
 * @param {number} lineEnd - Ending line number (1-indexed)
 * @returns {Promise<string>} Function source code
 *
 * @example
 * ```typescript
 * const code = await extractFunctionCode(
 *   '/tmp/contracts/Token.sol',
 *   42,
 *   58
 * );
 * ```
 *
 * @since 4.0.0
 */
export async function extractFunctionCode(
  contractPath: string,
  lineStart: number,
  lineEnd: number
): Promise<string> {
  // Implementation
}

/**
 * Finds the function containing a specific line number
 *
 * @param {ParsedFunction[]} functions - Parsed functions
 * @param {number} lineNumber - Line number to search for
 * @returns {ParsedFunction | undefined} Function containing the line, or undefined
 *
 * @example
 * ```typescript
 * const functions = await parseSolidityFunctions(contractPath);
 * const targetFn = findFunctionAtLine(functions, 42);
 *
 * if (targetFn) {
 *   console.log(`Vulnerability in ${targetFn.name}()`);
 * }
 * ```
 *
 * @since 4.0.0
 */
export function findFunctionAtLine(
  functions: ParsedFunction[],
  lineNumber: number
): ParsedFunction | undefined {
  // Implementation
}
```

## Template: LLM Analyzer

```typescript
/**
 * Analyzes a contract vulnerability using Claude AI
 *
 * Constructs an optimized prompt with:
 * - Original Slither finding
 * - Contract source code
 * - Similar historical exploits from knowledge base
 * - Request for enhanced analysis
 *
 * Then calls Claude API and parses the structured response.
 *
 * @param {AnalyzeParams} params - Analysis parameters
 * @param {VulnerabilityFinding} params.finding - Original Slither finding
 * @param {string} params.contractCode - Full contract source code
 * @param {KnowledgeDocument[]} params.similarExploits - Related exploits from KB
 * @returns {Promise<EnhancedFinding>} AI-enhanced finding
 *
 * @throws {Error} If API key is invalid
 * @throws {Error} If API request fails
 * @throws {Error} If response parsing fails
 *
 * @example
 * ```typescript
 * const enhanced = await analyzeWithLLM({
 *   finding: slitherFinding,
 *   contractCode: sourceCode,
 *   similarExploits: kbResults,
 * });
 *
 * console.log(`AI Confidence: ${enhanced.aiConfidenceScore}`);
 * console.log(`Remediation: ${enhanced.remediationSuggestion}`);
 * ```
 *
 * @see {@link constructPrompt} for prompt engineering
 * @see {@link parseResponse} for response parsing
 *
 * @since 4.0.0
 */
export async function analyzeWithLLM(
  params: AnalyzeParams
): Promise<EnhancedFinding> {
  // Implementation
}

/**
 * Constructs an optimized prompt for vulnerability analysis
 *
 * @param {PromptParams} params - Prompt construction parameters
 * @returns {string} Formatted prompt for Claude API
 *
 * @example
 * ```typescript
 * const prompt = constructPrompt({
 *   finding: slitherFinding,
 *   contractCode: code,
 *   context: kbDocs,
 * });
 * ```
 *
 * @since 4.0.0
 */
export function constructPrompt(params: PromptParams): string {
  // Implementation
}

/**
 * Parses and validates LLM response into structured finding
 *
 * @param {string} response - Raw LLM response text
 * @param {VulnerabilityFinding} original - Original finding for merging
 * @returns {EnhancedFinding} Validated enhanced finding
 *
 * @throws {Error} If response format is invalid
 *
 * @since 4.0.0
 */
export function parseResponse(
  response: string,
  original: VulnerabilityFinding
): EnhancedFinding {
  // Implementation
}
```

## Template: Report Generator

```typescript
/**
 * Merges AI-enhanced findings with original Slither findings
 *
 * Creates a unified report containing:
 * - Enhanced Slither findings (with AI insights added)
 * - New findings discovered by AI
 * - Original Slither findings (if not enhanced)
 *
 * @param {VulnerabilityFinding[]} slitherFindings - Original Slither findings
 * @param {EnhancedFinding[]} aiFindings - AI-enhanced/new findings
 * @returns {VulnerabilityFinding[]} Merged findings array
 *
 * @example
 * ```typescript
 * const finalFindings = mergeFindingsReport(
 *   slitherFindings,
 *   aiEnhancedFindings
 * );
 *
 * console.log(`Total findings: ${finalFindings.length}`);
 *
 * const aiEnhanced = finalFindings.filter(
 *   f => f.analysisMethod === 'AI' || f.analysisMethod === 'HYBRID'
 * );
 * console.log(`AI-enhanced: ${aiEnhanced.length}`);
 * ```
 *
 * @since 4.0.0
 */
export function mergeFindingsReport(
  slitherFindings: VulnerabilityFinding[],
  aiFindings: EnhancedFinding[]
): VulnerabilityFinding[] {
  // Implementation
}

/**
 * Generates a summary report of AI analysis metrics
 *
 * @param {MetricsInput} input - Input data for metrics calculation
 * @returns {AIAnalysisMetrics} Calculated metrics
 *
 * @example
 * ```typescript
 * const metrics = generateMetricsReport({
 *   originalCount: 5,
 *   enhancedCount: 3,
 *   newCount: 2,
 *   startTime: Date.now() - 2000,
 *   model: 'claude-sonnet-4-5',
 *   tokensUsed: 3500,
 * });
 * ```
 *
 * @since 4.0.0
 */
export function generateMetricsReport(
  input: MetricsInput
): AIAnalysisMetrics {
  // Implementation
}

/**
 * Validates and sanitizes LLM-generated content
 *
 * Removes potentially harmful content:
 * - Script tags
 * - SQL injection attempts
 * - Excessive length
 * - Invalid characters
 *
 * @param {string} content - Content to sanitize
 * @param {number} [maxLength=10000] - Maximum allowed length
 * @returns {string} Sanitized content
 *
 * @example
 * ```typescript
 * const safe = sanitizeLLMOutput(llmResponse.remediationSuggestion);
 * ```
 *
 * @since 4.0.0
 */
export function sanitizeLLMOutput(
  content: string,
  maxLength: number = 10000
): string {
  // Implementation
}
```

## Common JSDoc Tags

### Required Tags

- `@param` - Function parameters
- `@returns` - Return value
- `@throws` - Potential errors
- `@example` - Usage example
- `@since` - Version introduced

### Optional Tags

- `@see` - Related functions/docs
- `@deprecated` - Deprecated functions
- `@internal` - Internal functions
- `@async` - Async functions (TypeScript infers this)
- `@private` - Private methods
- `@public` - Public methods

### Type Documentation

```typescript
/**
 * Configuration options for AI analysis
 *
 * @interface AIConfig
 */
export interface AIConfig {
  /** Anthropic API key */
  apiKey: string;

  /** Model to use (default: 'claude-sonnet-4-5') */
  model?: string;

  /** Maximum tokens for response (default: 4096) */
  maxTokens?: number;

  /** Temperature for sampling (0.0-1.0, default: 0.1) */
  temperature?: number;
}
```

### Enum Documentation

```typescript
/**
 * Analysis methods for vulnerability detection
 *
 * @enum {string}
 */
export enum AnalysisMethod {
  /** Static analysis only (Slither) */
  STATIC = 'STATIC',

  /** AI analysis only */
  AI = 'AI',

  /** Hybrid: Slither finding enhanced with AI */
  HYBRID = 'HYBRID',
}
```

## Best Practices

1. **Be Specific**: Describe what the function does, not how
2. **Include Constraints**: Document parameter limits, ranges, formats
3. **Show Real Examples**: Use realistic data in examples
4. **Link Related Items**: Use @see to connect related functions
5. **Document Errors**: List all possible thrown errors
6. **Keep Updated**: Update JSDoc when changing function behavior
7. **Use Markdown**: JSDoc supports markdown in descriptions

## Validation

Validate JSDoc comments:

```bash
# TypeScript checks types automatically
npm run type-check

# Generate JSDoc documentation
npm run docs:generate

# Lint JSDoc comments
npm run lint:jsdoc
```

## Resources

- [JSDoc Official](https://jsdoc.app/)
- [TypeScript JSDoc](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [TSDoc Standard](https://tsdoc.org/)
