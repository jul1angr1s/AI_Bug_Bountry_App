/**
 * Protocol Agent
 *
 * Responsible for protocol registration workflow:
 * - Clone GitHub repository
 * - Verify contract path exists
 * - Compile contracts with Foundry
 * - Calculate risk score
 * - Register on-chain (Base Sepolia)
 * - Manage protocol lifecycle
 *
 * MCP Tools (Future):
 * - register_protocol - Register GitHub repo + terms
 * - set_bounty_terms - Configure bounty multipliers
 * - fund_pool - Deposit USDC to bounty pool
 * - get_status - Query protocol status
 */

export { processProtocolRegistration } from './worker.js';
export { cloneRepository, cleanupRepository } from './steps/clone.js';
export { verifyContractPath, listSolidityFiles } from './steps/verify.js';
export { compileContract, calculateRiskScore } from './steps/compile.js';
