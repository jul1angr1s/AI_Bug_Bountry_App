/**
 * Researcher Agent Scanning Steps
 *
 * This module exports all 6 scanning steps for the researcher agent pipeline:
 * 1. CLONE - Clone repository from GitHub
 * 2. COMPILE - Compile Solidity contracts with Foundry
 * 3. DEPLOY - Deploy contracts to local Anvil
 * 4. ANALYZE - Run static analysis tools (Slither)
 * 5. PROOF_GENERATION - Generate proofs for vulnerabilities
 * 6. SUBMIT - Submit proofs to Validator Agent
 */

export { executeCloneStep, type CloneStepParams, type CloneStepResult } from './clone.js';
export { executeCompileStep, type CompileStepParams, type CompileStepResult } from './compile.js';
export { executeDeployStep, killAnvil, type DeployStepParams, type DeployStepResult } from './deploy.js';
export { executeAnalyzeStep, type AnalyzeStepParams, type AnalyzeStepResult } from './analyze.js';
export { executeProofGenerationStep, type ProofGenerationParams, type ProofGenerationResult } from './proof-generation.js';
export { executeSubmitStep, cleanupResources, type SubmitStepParams, type SubmitStepResult } from './submit.js';
