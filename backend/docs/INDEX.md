# Backend Documentation Index

This directory contains comprehensive documentation for the AI Bug Bounty Platform backend system.

## Documentation Files

### Core AI Documentation

1. **[AI_ANALYSIS.md](./AI_ANALYSIS.md)** (550+ lines)
   - System architecture and components
   - Data flow diagrams
   - Configuration guide
   - Usage examples
   - Performance considerations
   - Error handling strategies

2. **[KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md)** (650+ lines)
   - Knowledge base overview and purpose
   - Document structure and format
   - Adding and managing documents
   - Rebuilding the index
   - Versioning strategy
   - Search and retrieval
   - Best practices

3. **[AI_TESTING.md](./AI_TESTING.md)** (550+ lines)
   - Testing philosophy
   - Mock patterns for LLM
   - Test fixtures usage
   - Running tests locally
   - CI/CD integration
   - Debugging strategies

4. **[JSDOC_TEMPLATES.md](./JSDOC_TEMPLATES.md)** (450+ lines)
   - JSDoc comment templates
   - Documentation standards
   - Type documentation
   - Best practices
   - Validation tools

### General Documentation

5. **[README.md](../README.md)** (600+ lines)
   - Backend overview
   - Quick start guide
   - API reference
   - AI features section
   - Deployment guide
   - Troubleshooting

6. **[TESTING.md](../TESTING.md)** (360 lines)
   - General testing guide
   - Test structure
   - Configuration
   - Troubleshooting

## Quick Navigation

### For Developers

**Getting Started**:
1. Start with [Backend README](../README.md) for overview
2. Follow [Quick Start](../README.md#quick-start) to set up
3. Review [AI Analysis](./AI_ANALYSIS.md) for AI features

**Writing Code**:
1. Use [JSDoc Templates](./JSDOC_TEMPLATES.md) for documentation
2. Follow patterns in [AI_ANALYSIS.md](./AI_ANALYSIS.md#core-components)
3. Write tests using [AI_TESTING.md](./AI_TESTING.md) patterns

**Testing**:
1. Read [AI_TESTING.md](./AI_TESTING.md) for AI test patterns
2. Check [TESTING.md](../TESTING.md) for general testing
3. Run tests: `npm test`

### For Security Researchers

**Understanding the System**:
1. [AI_ANALYSIS.md](./AI_ANALYSIS.md#overview) - How AI enhances detection
2. [Backend README](../README.md#ai-analysis-features) - Feature overview
3. [Knowledge Base](./KNOWLEDGE_BASE.md) - Historical exploits database

**Adding Exploits**:
1. [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md#adding-new-documents) - Add new exploits
2. [Document Template](./KNOWLEDGE_BASE.md#standard-document-template) - Structure
3. [Rebuild Guide](./KNOWLEDGE_BASE.md#rebuilding-the-knowledge-base) - Update KB

### For DevOps/Operations

**Deployment**:
1. [Backend README](../README.md#deployment) - Deployment guide
2. [Configuration](./AI_ANALYSIS.md#configuration) - Environment variables
3. [Monitoring](../README.md#monitoring) - Health checks

**Maintenance**:
1. [Knowledge Base Management](./KNOWLEDGE_BASE.md#versioning-strategy) - KB updates
2. [Troubleshooting](../README.md#troubleshooting) - Common issues
3. [Cache Management](./KNOWLEDGE_BASE.md#cache-invalidation) - Cache strategy

## Documentation Structure

```
backend/
├── README.md                          # Main backend documentation
├── TESTING.md                         # General testing guide
├── docs/
│   ├── INDEX.md                       # This file
│   ├── AI_ANALYSIS.md                 # AI system architecture
│   ├── KNOWLEDGE_BASE.md              # KB management guide
│   ├── AI_TESTING.md                  # AI testing patterns
│   └── JSDOC_TEMPLATES.md             # JSDoc templates
├── knowledge_base/
│   └── exploits/                      # Vulnerability documents
│       └── [exploit-name].md
└── src/
    └── agents/
        └── researcher/
            ├── ai/                    # AI components (to be implemented)
            │   ├── embeddings.ts
            │   ├── knowledge-base.ts
            │   ├── function-parser.ts
            │   ├── llm-analyzer.ts
            │   └── report-generator.ts
            └── steps/
                └── ai-deep-analysis.ts # AI step orchestrator
```

## Component Documentation Map

### AI Deep Analysis Pipeline

| Component | Implementation | Documentation | Tests |
|-----------|---------------|---------------|-------|
| Orchestrator | `steps/ai-deep-analysis.ts` | [AI_ANALYSIS.md](./AI_ANALYSIS.md#1-ai-deep-analysis-orchestrator-ai-deep-analysisets) | `steps/__tests__/ai-deep-analysis.test.ts` |
| Function Parser | `ai/function-parser.ts` (planned) | [AI_ANALYSIS.md](./AI_ANALYSIS.md#2-function-parser) | [AI_TESTING.md](./AI_TESTING.md#template-function-parser) |
| Knowledge Base | `ai/knowledge-base.ts` (planned) | [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md) | [AI_TESTING.md](./AI_TESTING.md#template-knowledge-base-manager) |
| Embeddings | `ai/embeddings.ts` (planned) | [AI_ANALYSIS.md](./AI_ANALYSIS.md#4-embeddings-service) | [AI_TESTING.md](./AI_TESTING.md#template-embeddings-service) |
| LLM Analyzer | `ai/llm-analyzer.ts` (planned) | [AI_ANALYSIS.md](./AI_ANALYSIS.md#5-llm-analyzer) | [AI_TESTING.md](./AI_TESTING.md#template-llm-analyzer) |
| Report Generator | `ai/report-generator.ts` (planned) | [AI_ANALYSIS.md](./AI_ANALYSIS.md#6-report-generator) | [AI_TESTING.md](./AI_TESTING.md#template-report-generator) |

## API Documentation Map

### REST Endpoints

| Endpoint | Method | Documentation |
|----------|--------|---------------|
| `/api/v1/scans/:id/findings` | GET | [README.md](../README.md#query-ai-findings) |
| `/api/admin/knowledge-base/rebuild` | POST | [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md#method-1-admin-api-recommended) |
| `/api/admin/knowledge-base/stats` | GET | [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md#get-apiadminknowledge-basestats) |
| `/api/admin/knowledge-base/search` | POST | [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md#post-apiadminknowledge-basesearch) |

## Environment Variables Reference

| Variable | Required | Default | Documentation |
|----------|----------|---------|---------------|
| `AI_ANALYSIS_ENABLED` | No | `false` | [AI_ANALYSIS.md](./AI_ANALYSIS.md#environment-variables) |
| `ANTHROPIC_API_KEY` | If AI enabled | - | [AI_ANALYSIS.md](./AI_ANALYSIS.md#environment-variables) |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-5` | [AI_ANALYSIS.md](./AI_ANALYSIS.md#environment-variables) |
| `KB_VERSION` | No | `v1` | [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md#versioning-strategy) |
| `AI_CACHE_ENABLED` | No | `true` | [AI_ANALYSIS.md](./AI_ANALYSIS.md#caching-strategy) |

## Test Documentation Map

| Test Type | Location | Documentation |
|-----------|----------|---------------|
| Unit Tests | `src/agents/researcher/ai/__tests__/` | [AI_TESTING.md](./AI_TESTING.md#test-structure) |
| Integration Tests | `src/agents/researcher/__tests__/integration/` | [AI_TESTING.md](./AI_TESTING.md#integration-tests-medium-mocked-api-real-db) |
| E2E Tests | Tagged with `@ai-real` | [AI_TESTING.md](./AI_TESTING.md#e2e-tests-with-real-api-slow-optional) |
| Test Fixtures | `src/agents/researcher/ai/__tests__/fixtures/` | [AI_TESTING.md](./AI_TESTING.md#test-fixtures) |

## Common Tasks

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run AI tests
npm run test:ai

# Generate documentation
npm run docs:generate
```

### Knowledge Base

```bash
# Rebuild knowledge base
npm run kb:rebuild

# Validate documents
npm run kb:validate

# Check metadata
npm run kb:check-metadata
```

### Testing

```bash
# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Generate coverage
npm run test:coverage

# Run with real API (requires key)
npm run test:ai-real
```

## Related Documentation

### External Resources

- [Anthropic Claude API](https://docs.anthropic.com/claude/reference)
- [Slither Documentation](https://github.com/crytic/slither)
- [Foundry Book](https://book.getfoundry.sh/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Vitest Docs](https://vitest.dev/)

### Project Documentation

- [Main README](../../README.md) - Project overview
- [Frontend Docs](../../frontend/README.md) - Frontend documentation
- [Smart Contracts](../../backend/contracts/README.md) - Contract documentation

## Contributing to Documentation

### Documentation Standards

1. **Use Markdown** - All docs in `.md` format
2. **Include Examples** - Real-world usage examples
3. **Keep Updated** - Update docs when changing code
4. **Link Liberally** - Cross-reference related docs
5. **Be Concise** - Clear and to the point

### Adding New Documentation

1. Create file in `backend/docs/`
2. Add entry to this INDEX.md
3. Cross-reference from related docs
4. Update README.md if user-facing
5. Submit PR with documentation changes

### Documentation Review Checklist

- [ ] Clear title and overview
- [ ] Table of contents for long docs
- [ ] Code examples with syntax highlighting
- [ ] Cross-references to related docs
- [ ] Up-to-date with current implementation
- [ ] No broken links
- [ ] Proper markdown formatting
- [ ] Added to INDEX.md

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 4.0.0 | 2025-02-01 | Initial AI documentation suite created |

## Support

For questions about documentation:
1. Check this INDEX for the right document
2. Search within relevant documentation
3. Open an issue for documentation improvements
4. Contact the development team

---

**Last Updated**: 2025-02-01
**Maintained By**: AI Bug Bounty Team
