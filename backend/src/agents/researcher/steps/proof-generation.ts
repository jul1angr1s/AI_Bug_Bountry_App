import { nanoid } from 'nanoid';
import { Finding } from '@prisma/client';
import { proofRepository } from '../../../db/repositories.js';

export interface ProofGenerationParams {
  scanId: string;
  findings: Finding[];
  clonedPath: string;
  deploymentAddress?: string;
}

export interface ProofData {
  id: string;
  findingId: string;
  vulnerabilityType: string;
  severity: string;
  description: string;
  location: {
    filePath: string;
    lineNumber?: number;
    functionSelector?: string;
  };
  exploitDetails: {
    reproductionSteps: string[];
    expectedOutcome: string;
    actualOutcome?: string;
  };
  contractDetails?: {
    deploymentAddress?: string;
    affectedFunction?: string;
  };
  metadata: {
    generatedAt: string;
    scanId: string;
    confidenceScore: number;
  };
}

export interface ProofGenerationResult {
  proofs: ProofData[];
  proofsCreated: number;
}

/**
 * PROOF_GENERATION Step - Generate proofs for discovered vulnerabilities
 *
 * This step:
 * 1. Iterates through findings
 * 2. Generates proof structure for each vulnerability
 * 3. Creates reproduction steps
 * 4. Saves proofs to database (encrypted in future)
 * 5. Returns proof objects
 */
export async function executeProofGenerationStep(
  params: ProofGenerationParams
): Promise<ProofGenerationResult> {
  const { scanId, findings, clonedPath, deploymentAddress } = params;

  console.log(`[ProofGen] Generating proofs for ${findings.length} findings...`);

  const proofs: ProofData[] = [];

  for (const finding of findings) {
    try {
      const proof = await generateProofForFinding(
        scanId,
        finding,
        clonedPath,
        deploymentAddress
      );

      proofs.push(proof);

      console.log(`[ProofGen] Generated proof for finding ${finding.id}`);
    } catch (error) {
      console.error(`[ProofGen] Failed to generate proof for finding ${finding.id}:`, error);
      // Continue with other findings
    }
  }

  console.log(`[ProofGen] Generated ${proofs.length} proofs`);

  return {
    proofs,
    proofsCreated: proofs.length,
  };
}

/**
 * Generate proof structure for a single finding
 */
async function generateProofForFinding(
  scanId: string,
  finding: Finding,
  clonedPath: string,
  deploymentAddress?: string
): Promise<ProofData> {
  // Generate unique proof ID
  const proofId = nanoid(16);

  // Generate reproduction steps based on vulnerability type
  const reproductionSteps = generateReproductionSteps(finding, deploymentAddress);

  // Generate expected outcome
  const expectedOutcome = generateExpectedOutcome(finding);

  // Create proof data structure
  const proofData: ProofData = {
    id: proofId,
    findingId: finding.id,
    vulnerabilityType: finding.vulnerabilityType,
    severity: finding.severity,
    description: finding.description,
    location: {
      filePath: finding.filePath,
      lineNumber: finding.lineNumber || undefined,
      functionSelector: finding.functionSelector || undefined,
    },
    exploitDetails: {
      reproductionSteps,
      expectedOutcome,
    },
    contractDetails: deploymentAddress
      ? {
          deploymentAddress,
          affectedFunction: finding.functionSelector || undefined,
        }
      : undefined,
    metadata: {
      generatedAt: new Date().toISOString(),
      scanId,
      confidenceScore: finding.confidenceScore,
    },
  };

  // Serialize proof data to JSON
  const proofPayload = JSON.stringify(proofData, null, 2);

  // For MVP: Skip encryption, just base64 encode
  // TODO: Implement actual encryption in Task 4.1
  const encryptedPayload = Buffer.from(proofPayload).toString('base64');

  // Generate placeholder signature
  // TODO: Implement actual signature in Task 4.1
  const researcherSignature = `0x${Buffer.from(proofId).toString('hex')}`;

  // Store proof in database
  await proofRepository.createProof({
    scanId,
    findingId: finding.id,
    encryptedPayload,
    researcherSignature,
    encryptionKeyId: 'mvp-placeholder-key',
  });

  return proofData;
}

/**
 * Generate reproduction steps based on vulnerability type
 */
function generateReproductionSteps(finding: Finding, deploymentAddress?: string): string[] {
  const steps: string[] = [];

  // Common first steps
  if (deploymentAddress) {
    steps.push(`1. Deploy or connect to contract at address: ${deploymentAddress}`);
  } else {
    steps.push('1. Deploy the vulnerable contract to a test network');
  }

  // Vulnerability-specific steps
  switch (finding.vulnerabilityType) {
    case 'REENTRANCY':
      steps.push(
        '2. Create a malicious contract with a fallback function',
        '3. Call the vulnerable function from the malicious contract',
        '4. In the fallback, recursively call the vulnerable function',
        '5. Observe multiple withdrawals before state update'
      );
      break;

    case 'ACCESS_CONTROL':
      steps.push(
        '2. Call the vulnerable function from an unauthorized account',
        '3. Observe that the function executes without proper access control',
        '4. Verify that privileged operations can be performed by anyone'
      );
      break;

    case 'ARBITRARY_SEND':
      steps.push(
        '2. Call the vulnerable function with an attacker-controlled address',
        '3. Observe that funds are sent to the arbitrary address',
        '4. Verify that the contract balance decreases'
      );
      break;

    case 'DELEGATECALL':
      steps.push(
        '2. Deploy a malicious contract with the same storage layout',
        '3. Call the function that uses delegatecall with the malicious contract address',
        '4. Observe that the malicious contract can modify storage',
        '5. Verify that state variables have been manipulated'
      );
      break;

    case 'UNCHECKED_RETURN_VALUE':
      steps.push(
        '2. Set up a scenario where the external call will fail',
        '3. Call the vulnerable function',
        '4. Observe that execution continues despite the failed call',
        '5. Verify that the contract state is inconsistent'
      );
      break;

    default:
      // Generic steps
      steps.push(
        `2. Locate the vulnerable code at ${finding.filePath}:${finding.lineNumber || 'unknown'}`,
        `3. ${finding.functionSelector ? `Call function ${finding.functionSelector}` : 'Execute vulnerable code path'}`,
        '4. Observe the vulnerability being exploited',
        '5. Verify the security impact'
      );
  }

  return steps;
}

/**
 * Generate expected outcome description
 */
function generateExpectedOutcome(finding: Finding): string {
  switch (finding.vulnerabilityType) {
    case 'REENTRANCY':
      return 'Multiple withdrawals executed before state update, allowing attacker to drain contract balance';

    case 'ACCESS_CONTROL':
      return 'Unauthorized user able to execute privileged functions, potentially taking control of contract';

    case 'ARBITRARY_SEND':
      return 'Funds sent to attacker-controlled address, depleting contract balance';

    case 'DELEGATECALL':
      return 'Malicious contract able to modify storage variables, potentially taking control of contract';

    case 'UNCHECKED_RETURN_VALUE':
      return 'Failed external call not detected, leading to inconsistent contract state';

    case 'SELFDESTRUCT':
      return 'Contract can be destroyed by unauthorized user, causing permanent loss of funds and functionality';

    case 'TIMESTAMP_DEPENDENCE':
      return 'Contract behavior can be manipulated by miner timestamp control';

    case 'TX_ORIGIN':
      return 'Phishing attack possible, allowing attacker to execute transactions on behalf of victim';

    case 'WEAK_RANDOMNESS':
      return 'Predictable random values allow attacker to game the system';

    case 'UNINITIALIZED_STORAGE':
    case 'UNINITIALIZED_VARIABLE':
      return 'Uninitialized variables may contain unexpected values, leading to unpredictable behavior';

    default:
      return `Vulnerability of type ${finding.vulnerabilityType} can be exploited as described: ${finding.description}`;
  }
}
