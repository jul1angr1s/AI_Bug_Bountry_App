# Kimi 2.5 API Integration Guide

## Overview

The platform uses **Kimi 2.5** (by Moonshot AI) via **NVIDIA's API Gateway** for AI-powered vulnerability analysis. This document explains the setup, configuration, and usage.

## API Details

- **Provider**: Moonshot AI (via NVIDIA API Gateway)
- **Model**: `moonshotai/kimi-k2.5`
- **Endpoint**: `https://integrate.api.nvidia.com/v1/chat/completions`
- **Features**: Extended thinking mode, 128k+ context window
- **Use Cases**: Proof validation, vulnerability analysis, code review

## Environment Configuration

Add to `backend/.env`:

```env
KIMI_API_KEY=nvapi-...
KIMI_API_URL=https://integrate.api.nvidia.com/v1
KIMI_MODEL=moonshotai/kimi-k2.5
```

- `KIMI_API_KEY`: Your NVIDIA API key (starts with `nvapi-`)
- `KIMI_API_URL`: Optional, defaults to NVIDIA endpoint
- `KIMI_MODEL`: Optional, defaults to `moonshotai/kimi-k2.5`

## API Request Structure

```javascript
{
  "model": "moonshotai/kimi-k2.5",
  "messages": [{"role": "user", "content": "..."}],
  "max_tokens": 16384,
  "temperature": 0.3,
  "top_p": 1.0,
  "stream": false,
  "chat_template_kwargs": {
    "thinking": true  // Enable extended reasoning mode
  }
}
```

### Headers

```javascript
{
  "Authorization": "Bearer nvapi-...",
  "Accept": "application/json",  // Use "text/event-stream" for streaming
  "Content-Type": "application/json"
}
```

## Response Structure

With `thinking: true`, Kimi 2.5 returns:

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "reasoning_content": "... detailed thinking process ...",
      "content": "... final answer ..."
    }
  }],
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 500,
    "total_tokens": 545
  }
}
```

- `reasoning_content`: The model's internal reasoning/thinking process
- `content`: The final answer (may be null if all tokens used for thinking)

## Usage

### Basic Chat

```typescript
import { getKimiClient } from './lib/llm.js';

const kimiClient = getKimiClient();

const response = await kimiClient.chat(
  [
    { role: 'system', content: 'You are a security expert' },
    { role: 'user', content: 'Analyze this vulnerability...' }
  ],
  0.3,      // temperature (0-1, lower = more consistent)
  16384,    // max_tokens
  true      // enableThinking mode
);

console.log(response.content);  // Combined reasoning + answer
console.log(response.usage);    // Token usage stats
```

### Proof Analysis

```typescript
const analysis = await kimiClient.analyzeProof(
  'REENTRANCY',
  proofCode,
  contractCode,
  'Description of the vulnerability'
);

console.log(analysis.isValid);       // true/false
console.log(analysis.confidence);    // 0-100
console.log(analysis.reasoning);     // Technical explanation
console.log(analysis.severity);      // CRITICAL/HIGH/MEDIUM/LOW
```

## Testing

### Quick Health Check

```bash
cd backend
npx tsx src/lib/__tests__/kimi-api-test.ts
```

### Debug Response Structure

```bash
cd backend
npx tsx src/lib/__tests__/kimi-debug-test.ts
```

Expected output:
```
✓ Client initialized
✓ Health check passed
✓ Chat completion successful
✓ All tests passed!
```

## Current Integrations

### 1. Validator Agent (LLM-based)
- **File**: `backend/src/agents/validator/llm-worker.ts`
- **Purpose**: Validates exploit proofs using AI analysis
- **Status**: ✅ Fully implemented

### 2. Researcher Agent (AI Deep Analysis)
- **File**: `backend/src/agents/researcher/steps/ai-deep-analysis.ts`
- **Purpose**: Enhances Slither findings with AI insights
- **Status**: ⚠️ Placeholder (needs implementation)
- **Feature Flag**: `AI_ANALYSIS_ENABLED=true`

## Token Usage Guidelines

With thinking mode enabled:
- **Health check**: ~100 tokens
- **Simple query**: ~500-1000 tokens
- **Proof analysis**: ~2000-5000 tokens
- **Deep analysis**: ~5000-16000 tokens

**Recommendation**: Use `max_tokens: 16384` for proof validation to ensure enough space for both thinking and the final answer.

## Best Practices

1. **Temperature Settings**:
   - Use `0.3` for validation (consistent results)
   - Use `0.7-1.0` for creative analysis

2. **Thinking Mode**:
   - Enable for complex tasks (proof validation, deep analysis)
   - Disable for simple queries (health checks, basic Q&A)

3. **Token Limits**:
   - Allow sufficient tokens for both reasoning and answer
   - Monitor usage for cost optimization

4. **Error Handling**:
   - The client gracefully handles API failures
   - Always check `response.content` for empty responses
   - Log errors for debugging

## Troubleshooting

### Empty Response Content

If `response.content` is empty:
- Check `max_tokens` is sufficient (recommend 16384)
- Verify API key is valid
- Check response structure for `reasoning_content` field

### API Errors

```bash
Error: Kimi API error: 401 Unauthorized
```
- Verify `KIMI_API_KEY` is set correctly
- Check key format starts with `nvapi-`

```bash
Error: Kimi API error: 429 Too Many Requests
```
- Rate limit exceeded, implement retry logic
- Check quota limits

### Health Check Fails

```bash
Health check failed - validation may not work
```
- Check network connectivity
- Verify API endpoint is accessible
- Ensure API key has proper permissions

## Next Steps

To fully enable AI analysis in the Researcher Agent:

1. Implement AI deep analysis in `ai-deep-analysis.ts`
2. Set `AI_ANALYSIS_ENABLED=true` in `.env`
3. Configure optimal token limits based on contract size
4. Monitor token usage and costs
5. Fine-tune prompts for better results

## Support

- **Documentation**: [NVIDIA API Docs](https://docs.nvidia.com/nim/)
- **Model Info**: Moonshot AI Kimi 2.5
- **Issues**: Check logs in `backend/logs/` or console output
