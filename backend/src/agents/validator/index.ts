/**
 * Validator Agent
 *
 * Responsible for independent exploit verification:
 * - Subscribe to Redis 'PROOF_SUBMISSION' channel
 * - Decrypt and parse exploit proofs from Researcher Agent
 * - Clone same repository/commit as Researcher
 * - Deploy fresh contract instance to isolated Anvil sandbox (port 31338)
 * - Execute exploit and capture state changes
 * - Verify vulnerability is real (TRUE/FALSE)
 * - Update validation result in database
 * - (Future) Record result on ERC-8004 registry (Base Sepolia)
 *
 * MCP Tools (Future):
 * - clone_repo - Clone same commit as Researcher
 * - spawn_sandbox - Create isolated Anvil instance
 * - deploy_isolated - Deploy to sandbox
 * - execute_exploit - Run exploit code
 * - update_registry - Record TRUE/FALSE on Base Sepolia
 */

export {
  startValidatorAgent,
  stopValidatorAgent,
} from './worker.js';

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
