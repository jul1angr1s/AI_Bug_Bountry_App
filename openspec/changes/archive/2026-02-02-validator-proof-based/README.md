# Validator Agent - Proof-Based Validation

**Status**: Not Started
**Created**: 2026-02-01
**Owner**: Backend Team
**Parent Change**: demonstration-workflow

## Overview

Complete the Validator Agent implementation using proof-based validation with Kimi 2.5 local LLM for exploit proof analysis. This approach validates vulnerability proofs through AI analysis rather than sandboxed execution.

## Goal

Enable automated validation of vulnerability findings by analyzing exploit proofs with Kimi 2.5 LLM, calculating confidence scores, and triggering payment for validated findings.

## Key Constraints

- ✅ Use Kimi 2.5 local LLM (http://localhost:11434) for proof analysis
- ✅ NO sandbox execution required for MVP
- ✅ NO on-chain ValidationRegistry integration for MVP
- ✅ Focus on proof logic analysis, not actual code execution
- ✅ Validation completes in <60 seconds

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│              PROOF-BASED VALIDATION FLOW                  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  1. FETCH PROOF                                           │
│     • Validator Agent picks up job from queue             │
│     • Fetches Finding record with proof JSON              │
│     • Extracts: exploit steps, contract code, location    │
│                                                           │
│  2. LLM ANALYSIS (Kimi 2.5)                              │
│     • Prepare prompt with proof and contract context      │
│     • Submit to Kimi 2.5 API                             │
│     • Prompt: "Validate this exploit proof..."           │
│     • LLM analyzes attack vector feasibility              │
│     • LLM identifies vulnerability pattern                │
│     • LLM calculates confidence score (0-100)             │
│                                                           │
│  3. UPDATE FINDING                                        │
│     • Parse LLM response                                  │
│     • Extract: result (VALID/INVALID), confidence         │
│     • Update Finding record:                              │
│       - status: VALIDATED or INVALID                      │
│       - validatedAt: timestamp                            │
│       - confidence: score                                 │
│       - validationNotes: LLM reasoning                    │
│                                                           │
│  4. TRIGGER PAYMENT                                       │
│     • If status=VALIDATED:                                │
│       - Create Payment record                             │
│       - Add job to payment queue                          │
│       - Emit validation:complete event                    │
│     • If status=INVALID:                                  │
│       - Emit validation:invalid event                     │
│       - NO payment triggered                              │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## Kimi 2.5 Integration

### LLM Prompt Template

```typescript
const VALIDATION_PROMPT = `
You are an expert security auditor validating an exploit proof for a Solidity smart contract vulnerability.

**Contract Code:**
\`\`\`solidity
${contractCode}
\`\`\`

**Vulnerability Claim:**
Type: ${vulnerabilityType}
Severity: ${severity}
Location: ${location}

**Exploit Proof:**
${exploitSteps}

**Exploit Code:**
\`\`\`solidity
${exploitContract}
\`\`\`

**Task:**
1. Analyze if the exploit proof demonstrates a valid vulnerability
2. Verify the attack vector is feasible
3. Check if the exploit steps are logically sound
4. Assess the severity claim (CRITICAL/HIGH/MEDIUM/LOW)
5. Calculate a confidence score (0-100) for this vulnerability

**Response Format (JSON):**
{
  "isValid": true/false,
  "confidence": 0-100,
  "reasoning": "Detailed explanation of your analysis",
  "severityCorrect": true/false,
  "attackVector": "Brief description of attack",
  "recommendations": "Fix recommendations"
}
`;
```

### LLM Response Parsing

```typescript
interface ValidationResult {
  isValid: boolean;
  confidence: number; // 0-100
  reasoning: string;
  severityCorrect: boolean;
  attackVector: string;
  recommendations: string;
}

async function validateProofWithLLM(
  proof: ExploitProof,
  contract: ContractInfo
): Promise<ValidationResult> {
  const prompt = buildValidationPrompt(proof, contract);

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'kimi-2.5',
      prompt: prompt,
      stream: false,
      format: 'json'
    })
  });

  const { response: llmOutput } = await response.json();
  return JSON.parse(llmOutput) as ValidationResult;
}
```

## Implementation Details

### Validator Worker

**File**: `backend/src/agents/validator/worker.ts`

```typescript
export async function processValidation(job: Job<ValidationJobData>) {
  const { findingId } = job.data;

  // 1. Fetch Finding with proof
  const finding = await prisma.finding.findUnique({
    where: { id: findingId },
    include: {
      protocol: true,
      scan: true
    }
  });

  if (!finding || !finding.proof) {
    throw new Error('Finding or proof not found');
  }

  // 2. Prepare context for LLM
  const proof = finding.proof as ExploitProof;
  const contractCode = await fetchContractCode(
    finding.protocol.githubUrl,
    finding.protocol.contractPath
  );

  // 3. Validate with Kimi 2.5 LLM
  const validationResult = await validateProofWithLLM(proof, {
    code: contractCode,
    path: finding.protocol.contractPath,
    name: finding.protocol.contractName
  });

  // 4. Update Finding
  await prisma.finding.update({
    where: { id: findingId },
    data: {
      status: validationResult.isValid ? 'VALIDATED' : 'INVALID',
      validatedAt: new Date(),
      confidence: validationResult.confidence,
      validationNotes: validationResult.reasoning
    }
  });

  // 5. Trigger payment if validated
  if (validationResult.isValid) {
    await createPaymentFromFinding(findingId);
    await emitWebSocketEvent('validation:complete', {
      findingId,
      result: 'VALIDATED',
      confidence: validationResult.confidence
    });
  } else {
    await emitWebSocketEvent('validation:invalid', {
      findingId,
      reasoning: validationResult.reasoning
    });
  }

  return validationResult;
}
```

## Thunder Loan Example

For the Thunder Loan oracle manipulation vulnerability:

**Proof Input**:
```json
{
  "vulnerabilityType": "ORACLE_MANIPULATION",
  "severity": "CRITICAL",
  "location": "ThunderLoan.sol:getCalculatedFee()",
  "exploitSteps": [
    "1. Request flash loan for large amount",
    "2. In callback, manipulate oracle price",
    "3. Fee calculation uses manipulated price",
    "4. Repay with reduced fee amount",
    "5. Profit from fee differential"
  ],
  "exploitContract": "contract ThunderLoanExploit { ... }",
  "expectedProfit": "~5% of loan amount"
}
```

**Expected LLM Response**:
```json
{
  "isValid": true,
  "confidence": 95,
  "reasoning": "The exploit proof demonstrates a valid oracle manipulation attack. The fee calculation in getCalculatedFee() uses an external oracle that can be manipulated during the flash loan callback, allowing the attacker to reduce the fee payment. This is a critical vulnerability in flash loan protocols.",
  "severityCorrect": true,
  "attackVector": "Flash loan oracle manipulation via callback manipulation",
  "recommendations": "Implement oracle price caching before flash loan execution, or use time-weighted average prices (TWAP) that cannot be manipulated in a single transaction."
}
```

## Success Criteria

- ✅ Validator worker processes validation queue jobs
- ✅ Kimi 2.5 LLM integration working (http://localhost:11434)
- ✅ Thunder Loan proof validates successfully (confidence >90%)
- ✅ Finding status updates correctly (VALIDATED/INVALID)
- ✅ Payment queue triggered on validation success
- ✅ WebSocket events broadcast validation results
- ✅ Validation completes in <60 seconds
- ✅ Error handling for LLM failures
- ✅ Retry logic for transient errors

## Files Modified

- `backend/src/agents/validator/worker.ts` - Complete implementation
- `backend/src/services/validation.service.ts` - Business logic
- `backend/src/lib/llm.ts` - Kimi 2.5 client
- `backend/src/server.ts` - Start validator worker
- `backend/src/queues/validation.queue.ts` - Queue config

## Testing Strategy

### Unit Tests
- LLM prompt building
- Response parsing
- Confidence score calculation
- Finding status transitions

### Integration Tests
- End-to-end validation flow
- LLM API integration
- Payment queue triggering
- WebSocket event broadcasting

### E2E Test
- Thunder Loan proof validation
- Verify LLM correctly identifies oracle manipulation
- Verify confidence score >90%
- Verify payment triggered

## Timeline

- Day 6-7: Implementation
- PR: ~800 lines in single focused PR

## Dependencies

- Kimi 2.5 LLM running on http://localhost:11434
- Finding records with proof JSON
- Payment queue infrastructure
- WebSocket server for events

## References

- `/project/FirstFlightDemonstration.md` - Thunder Loan demonstration
- Kimi 2.5 API documentation
- LLM prompt engineering best practices
