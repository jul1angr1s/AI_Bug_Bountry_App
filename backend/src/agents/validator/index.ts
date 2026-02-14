/**
 * Validator Agent
 *
 * Two validation modes:
 * 1. Execution-based (worker.ts) - Executes exploit in sandbox
 * 2. LLM-based (llm-worker.ts) - Analyzes proof with Kimi 2.5 LLM
 *
 * Phase 2 uses LLM-based validation for proof analysis and confidence scoring.
 */

// Execution-based validator (original)
export {
  startValidatorAgent,
  stopValidatorAgent,
} from './worker.js';

// LLM-based validator (Phase 2)
export {
  startValidatorAgentLLM,
  stopValidatorAgentLLM,
} from './llm-worker.js';

export {
  decryptProof,
  type ProofSubmissionMessage,
  type DecryptedProof,
} from './steps/decrypt.js';

export {
  spawnSandbox,
  deployToSandbox,
  killSandbox,
} from './steps/sandbox.js';

export {
  executeExploit,
  type ExecutionResult,
} from './steps/execute.js';
