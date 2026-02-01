# Knowledge Base Management Guide

## Overview

The Knowledge Base (KB) is a curated collection of vulnerability patterns, exploit examples, and security best practices used to enhance AI-powered smart contract analysis. It enables Retrieval Augmented Generation (RAG) to provide context-aware vulnerability detection.

## What is the Knowledge Base?

The Knowledge Base serves as the AI's "memory" of known vulnerabilities and exploit patterns. When analyzing a contract, the system:

1. Searches the KB for similar historical vulnerabilities
2. Retrieves relevant exploit examples
3. Provides this context to the LLM for enhanced analysis
4. Enables the AI to recognize patterns it has seen before

### Benefits

- **Improved Accuracy**: AI learns from historical exploits
- **Faster Analysis**: Pre-indexed patterns enable quick retrieval
- **Consistency**: Standardized vulnerability classifications
- **Continuous Learning**: KB grows with each new exploit discovered

## Document Structure

### File Format

Knowledge base documents are stored as **Markdown files** in `/backend/knowledge_base/exploits/`.

### Standard Document Template

```markdown
# [Vulnerability Type]: [Contract Name]

## Metadata
- **Severity**: CRITICAL | HIGH | MEDIUM | LOW | INFO
- **Category**: Reentrancy | Access Control | Integer Overflow | etc.
- **Tags**: #reentrancy #defi #erc20 #exploit
- **Date Discovered**: YYYY-MM-DD
- **Total Loss**: $X.XX Million USD (if applicable)

## Summary

Brief 2-3 sentence description of the vulnerability and its impact.

## Vulnerability Details

### Root Cause

Detailed explanation of what caused the vulnerability.

### Affected Code

\`\`\`solidity
// Vulnerable code example
function withdraw(uint amount) public {
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);
    balances[msg.sender] -= amount; // ❌ State update AFTER external call
}
\`\`\`

### Attack Vector

Step-by-step explanation of how the vulnerability can be exploited.

## Exploitation Example

\`\`\`solidity
// Attacker contract
contract Exploit {
    VulnerableContract target;

    function attack() public {
        target.withdraw(1 ether);
    }

    receive() external payable {
        // Reentrant call
        if (address(target).balance > 0) {
            target.withdraw(1 ether);
        }
    }
}
\`\`\`

## Impact

- **Direct Impact**: Loss of X ETH
- **Affected Users**: X users
- **Cascading Effects**: Description of secondary impacts

## Remediation

### Recommended Fix

\`\`\`solidity
// Secure implementation
function withdraw(uint amount) public nonReentrant {
    require(balances[msg.sender] >= amount, "Insufficient balance");

    balances[msg.sender] -= amount; // ✅ State update BEFORE external call

    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
\`\`\`

### Best Practices

1. Use OpenZeppelin's ReentrancyGuard
2. Follow Checks-Effects-Interactions pattern
3. Use pull payment pattern when possible
4. Add proper access controls

## References

- [Post-mortem Analysis](https://example.com/postmortem)
- [Transaction Hash](https://etherscan.io/tx/0x...)
- [Security Advisory](https://example.com/advisory)
- [Similar Exploits](./related-exploit.md)

## Related Vulnerabilities

- [DAO Hack (2016)](./dao-hack.md)
- [Cream Finance Exploit](./cream-finance.md)

---

**Document Version**: 1.0
**Last Updated**: YYYY-MM-DD
**Contributor**: Security Researcher Name
```

## Database Schema

Documents are processed and stored in PostgreSQL:

```prisma
model KnowledgeDocument {
  id        String    @id @default(uuid())
  source    String                 // Original file path
  title     String                 // Extracted from # heading
  content   String    @db.Text     // Full markdown content
  embedding Json                   // Vector embedding (1536 dimensions)
  severity  Severity?              // CRITICAL, HIGH, MEDIUM, LOW, INFO
  tags      String[]               // Extracted from #tags
  version   Int                    // KB version number
  createdAt DateTime  @default(now())

  @@index([version])
  @@index([severity])
  @@index([tags])
}
```

### Embedding Structure

Embeddings are stored as JSON arrays:

```json
{
  "embedding": [0.123, -0.456, 0.789, ..., 0.012],  // 1536 float values
  "model": "claude-3-embedding",
  "dimensions": 1536
}
```

## Adding New Documents

### Step 1: Create Document File

```bash
cd backend/knowledge_base/exploits/

# Create new document
nano reentrancy-dao-hack.md
```

Paste the document template and fill in details.

### Step 2: Follow Naming Conventions

**File naming pattern**: `{category}-{contract-name}.md`

Examples:
- `reentrancy-dao-hack.md`
- `access-control-poly-network.md`
- `integer-overflow-beautychain.md`
- `flash-loan-cream-finance.md`

### Step 3: Add Required Metadata

Ensure these fields are present:

```markdown
## Metadata
- **Severity**: HIGH
- **Category**: Reentrancy
- **Tags**: #reentrancy #dao #ethereum #2016
- **Date Discovered**: 2016-06-17
- **Total Loss**: $60 Million USD
```

### Step 4: Include Code Examples

Always include:
1. **Vulnerable code snippet** - Show the actual vulnerability
2. **Exploitation code** - Demonstrate how it's exploited
3. **Fixed code** - Show the secure implementation

### Step 5: Validate Document

```bash
# Check markdown syntax
npm run kb:validate

# Validate metadata fields
npm run kb:check-metadata
```

## Rebuilding the Knowledge Base

### When to Rebuild

Rebuild the KB when:
- ✅ New documents added
- ✅ Existing documents updated
- ✅ Severity classifications changed
- ✅ Embedding model upgraded
- ✅ Tags or metadata modified

### Rebuild Methods

#### Method 1: Admin API (Recommended)

```bash
# Authenticate as admin
curl -X POST http://localhost:3000/api/admin/knowledge-base/rebuild \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "success": true,
  "version": 2,
  "documentCount": 150,
  "message": "Knowledge base rebuilt successfully",
  "rebuiltAt": "2025-02-01T12:34:56.789Z",
  "stats": {
    "filesProcessed": 150,
    "embedingsGenerated": 150,
    "processingTimeMs": 45000,
    "tokensUsed": 125000
  }
}
```

#### Method 2: CLI Script

```bash
cd backend

# Rebuild KB with progress output
npm run kb:rebuild

# Rebuild specific version
npm run kb:rebuild -- --version=v2

# Dry run (validate without writing)
npm run kb:rebuild -- --dry-run
```

#### Method 3: Programmatic

```typescript
import { rebuildKnowledgeBase } from './ai/knowledge-base.js';

const result = await rebuildKnowledgeBase({
  version: 2,
  sourcePath: './knowledge_base/exploits',
  batchSize: 10,
});

console.log(`Rebuilt KB: ${result.documentCount} documents`);
```

## Versioning Strategy

### Version Number Schema

Format: `v{major}` (e.g., v1, v2, v3)

**Increment version when**:
- Adding 10+ new documents
- Major content restructuring
- Changing embedding model
- Updating severity classifications

### Version Management

```typescript
// Get current version
const currentVersion = await knowledgeBase.getCurrentVersion();

// Create new version
const newVersion = await knowledgeBase.createVersion({
  description: 'Added 15 new DeFi exploits from 2024',
  source: 'manual',
});

// List all versions
const versions = await knowledgeBase.listVersions();

// Rollback to previous version
await knowledgeBase.rollbackToVersion(1);
```

### Version History

Track changes in `/backend/knowledge_base/CHANGELOG.md`:

```markdown
# Knowledge Base Changelog

## v3 - 2025-02-01
- Added 15 new DeFi exploits from 2024
- Updated reentrancy examples with modern Solidity 0.8+
- Reclassified 5 vulnerabilities from HIGH to CRITICAL
- Total documents: 150

## v2 - 2025-01-15
- Initial import of 135 historical exploits
- Categories: Reentrancy, Access Control, Integer Overflow, Flash Loans
- Embedding model: claude-3-embedding

## v1 - 2025-01-01
- Initial knowledge base setup
- 10 sample exploits for testing
```

## Cache Invalidation

When the KB version changes, all AI analysis caches must be invalidated.

### Automatic Invalidation

The system automatically invalidates caches on version change:

```typescript
// On KB rebuild
await redis.set('ai:knowledge-base:version', newVersion);

// Invalidate all finding caches
const keys = await redis.keys('ai:finding:*');
if (keys.length > 0) {
  await redis.del(...keys);
}

// Clear embedding caches
await redis.del('ai:embeddings:*');
```

### Manual Cache Clearing

```bash
# Clear all AI caches
redis-cli --scan --pattern 'ai:*' | xargs redis-cli del

# Clear only finding caches
redis-cli --scan --pattern 'ai:finding:*' | xargs redis-cli del
```

## Search and Retrieval

### Semantic Search

The KB uses vector embeddings for semantic similarity search:

```typescript
import { searchKnowledgeBase } from './ai/knowledge-base.js';

// Search for similar vulnerabilities
const results = await searchKnowledgeBase({
  query: 'reentrancy in withdrawal function',
  topK: 5,
  filters: {
    severity: ['CRITICAL', 'HIGH'],
    tags: ['reentrancy'],
  },
});

results.forEach(doc => {
  console.log(`${doc.title} (similarity: ${doc.similarity})`);
  console.log(doc.content);
});
```

### Search Parameters

```typescript
interface SearchParams {
  query: string;           // Search query
  topK?: number;          // Number of results (default: 5)
  minSimilarity?: number; // Minimum cosine similarity (default: 0.7)
  filters?: {
    severity?: Severity[];
    tags?: string[];
    dateAfter?: Date;
  };
}
```

### Similarity Scoring

Cosine similarity ranges from -1 to 1:
- **0.9 - 1.0**: Highly similar (exact match)
- **0.8 - 0.9**: Very similar
- **0.7 - 0.8**: Similar (useful context)
- **< 0.7**: Not similar (exclude)

## Best Practices

### Content Guidelines

1. **Be Specific**: Include exact line numbers, function names, and code snippets
2. **Show Context**: Explain why the code is vulnerable, not just what is vulnerable
3. **Real Examples**: Use actual exploits when possible, with transaction hashes
4. **Clear Remediation**: Provide actionable fixes, not just "add access control"
5. **Tag Appropriately**: Use consistent, lowercase tags for categorization

### Metadata Guidelines

1. **Severity Classification**:
   - **CRITICAL**: Direct loss of funds, protocol takeover
   - **HIGH**: Significant impact, potential fund loss
   - **MEDIUM**: Limited impact, requires specific conditions
   - **LOW**: Minor issues, edge cases
   - **INFO**: Best practices, optimizations

2. **Tag Conventions**:
   - Vulnerability type: `#reentrancy`, `#access-control`, `#integer-overflow`
   - Blockchain: `#ethereum`, `#bsc`, `#polygon`
   - Protocol type: `#defi`, `#nft`, `#dao`
   - Year: `#2024`, `#2023`

3. **Date Format**: Always use `YYYY-MM-DD`

### Organization Guidelines

1. **One Vulnerability Per File**: Don't mix multiple unrelated vulnerabilities
2. **Link Related Exploits**: Reference similar vulnerabilities
3. **Update Regularly**: Add new exploits as they're discovered
4. **Archive Outdated**: Mark deprecated patterns (e.g., pre-0.8 Solidity)

### Quality Checklist

Before adding a document, verify:

- [ ] Markdown syntax is valid
- [ ] All metadata fields present
- [ ] Severity appropriate
- [ ] Tags follow conventions
- [ ] Code snippets included
- [ ] Remediation provided
- [ ] References linked
- [ ] No sensitive information (addresses, keys)

## Monitoring

### KB Health Metrics

Track these metrics:

```typescript
interface KBMetrics {
  totalDocuments: number;
  documentsBySeverity: Record<Severity, number>;
  documentsByCategory: Record<string, number>;
  averageDocumentLength: number;
  lastRebuildDate: Date;
  currentVersion: number;
  embeddingsCached: number;
}
```

### Query Analytics

Monitor search patterns:

```typescript
interface QueryAnalytics {
  totalSearches: number;
  averageResultCount: number;
  averageSimilarity: number;
  popularQueries: string[];
  lowQualityQueries: string[]; // < 0.7 similarity
}
```

## Troubleshooting

### Issue: Rebuild Fails

```bash
Error: Failed to generate embeddings
```

**Solutions**:
1. Check `ANTHROPIC_API_KEY` is set
2. Verify API quota not exceeded
3. Check document markdown syntax
4. Reduce `KB_EMBEDDINGS_BATCH_SIZE`

### Issue: Poor Search Results

```bash
Warning: All results below 0.7 similarity
```

**Solutions**:
1. Add more documents to KB
2. Improve query specificity
3. Check if category exists in KB
4. Verify embeddings were generated

### Issue: Cache Not Invalidating

```bash
Error: Still getting old KB results after rebuild
```

**Solutions**:
1. Check Redis connection
2. Manually clear cache: `redis-cli FLUSHDB`
3. Verify version number incremented
4. Check cache invalidation logic

## Performance Optimization

### Embedding Generation

```typescript
// Bad: Sequential processing
for (const doc of documents) {
  await generateEmbedding(doc);
}

// Good: Batch processing
const batches = chunk(documents, 10);
for (const batch of batches) {
  await Promise.all(batch.map(doc => generateEmbedding(doc)));
}
```

### Search Optimization

1. **Index Management**: Ensure proper database indexes
2. **Result Caching**: Cache frequently searched queries
3. **Lazy Loading**: Only load full content when needed
4. **Pagination**: Limit result sets for large KBs

## API Reference

### GET /api/admin/knowledge-base/stats

Returns KB statistics.

**Response**:
```json
{
  "version": 2,
  "documentCount": 150,
  "lastRebuild": "2025-02-01T12:00:00Z",
  "categories": {
    "reentrancy": 45,
    "access_control": 38,
    "integer_overflow": 22,
    "flash_loan": 15,
    "other": 30
  }
}
```

### POST /api/admin/knowledge-base/rebuild

Rebuilds the knowledge base.

**Request**:
```json
{
  "force": true,
  "version": 3,
  "description": "Added 2024 exploits"
}
```

**Response**: See "Rebuild Methods" section above.

### POST /api/admin/knowledge-base/search

Searches the knowledge base.

**Request**:
```json
{
  "query": "reentrancy withdrawal",
  "topK": 5,
  "filters": {
    "severity": ["CRITICAL", "HIGH"]
  }
}
```

**Response**:
```json
{
  "results": [
    {
      "id": "kb-doc-001",
      "title": "Reentrancy: DAO Hack",
      "similarity": 0.95,
      "severity": "CRITICAL",
      "excerpt": "The DAO hack exploited a reentrancy vulnerability..."
    }
  ],
  "total": 5,
  "query": "reentrancy withdrawal"
}
```

## Future Enhancements

1. **Automated Ingestion**: Scrape new exploits from security advisories
2. **Collaborative Editing**: Allow researchers to contribute via PR
3. **Document Versioning**: Track changes to individual documents
4. **Multi-Language Support**: Support multiple natural languages
5. **Graph Relationships**: Link related vulnerabilities in knowledge graph

## Resources

- [Markdown Guide](https://www.markdownguide.org/)
- [Anthropic Embeddings API](https://docs.anthropic.com/claude/reference)
- [Vector Similarity Search](https://www.pinecone.io/learn/vector-similarity/)
- [Example Documents](../knowledge_base/exploits/)

## Support

For questions or issues:
1. Check [AI_ANALYSIS.md](./AI_ANALYSIS.md) for system architecture
2. Review [AI_TESTING.md](./AI_TESTING.md) for testing strategies
3. Contact the security team for document review
