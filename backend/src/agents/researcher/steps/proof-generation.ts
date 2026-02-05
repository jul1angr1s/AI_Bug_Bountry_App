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
        '2. Create a malicious contract with a fallback/receive function',
        '3. Call the vulnerable function from the malicious contract',
        '4. In the fallback, recursively call the vulnerable function before state updates',
        '5. Observe multiple withdrawals executed before balance is decremented',
        '6. Verify funds drained exceed single withdrawal limit'
      );
      break;

    case 'ACCESS_CONTROL':
      steps.push(
        '2. Identify functions that should be restricted (onlyOwner, admin functions)',
        '3. Call the vulnerable function from an unauthorized account',
        '4. Observe that the function executes without proper access control checks',
        '5. Verify that privileged operations (withdraw, upgrade, pause) can be performed by anyone'
      );
      break;

    case 'ARBITRARY_SEND':
      steps.push(
        '2. Identify the function that sends ETH/tokens to user-controlled address',
        '3. Call the vulnerable function with an attacker-controlled address parameter',
        '4. Observe that funds are sent to the arbitrary address without validation',
        '5. Verify that the contract balance decreases by the expected amount'
      );
      break;

    case 'DELEGATECALL':
      steps.push(
        '2. Deploy a malicious contract with the same storage layout as target',
        '3. Call the function that uses delegatecall with the malicious contract address',
        '4. In malicious contract, modify critical storage slots (owner, balances)',
        '5. Verify that state variables in the original contract have been manipulated'
      );
      break;

    case 'UNCHECKED_RETURN_VALUE':
      steps.push(
        '2. Identify external calls that dont check return values (transfer, send, call)',
        '3. Set up a scenario where the external call will fail (contract without receive)',
        '4. Call the vulnerable function and observe execution continues despite failed call',
        '5. Verify that the contract state is inconsistent (balances updated but transfer failed)'
      );
      break;

    case 'ORACLE_MANIPULATION':
      steps.push(
        '2. Identify the price oracle dependency (DEX pool, Chainlink, custom oracle)',
        '3. Take a flash loan for large amount of the base asset',
        '4. Swap the flash loan amount on the DEX to manipulate spot price',
        '5. Call the vulnerable function that reads the manipulated price',
        '6. Profit from the price discrepancy (borrow more, pay less fees, liquidate)',
        '7. Swap back and repay flash loan with profit',
        `8. Vulnerable code: ${finding.description}`
      );
      break;

    case 'FLASH_LOAN_ATTACK':
      steps.push(
        '2. Identify the flash loan provider (Aave, dYdX, Uniswap)',
        '3. Request flash loan for maximum available liquidity',
        '4. Use borrowed funds to manipulate protocol state or prices',
        '5. Execute the exploit (oracle manipulation, governance attack, arbitrage)',
        '6. Repay flash loan plus fees within same transaction',
        '7. Keep the profit from the attack'
      );
      break;

    case 'INTEGER_OVERFLOW':
      steps.push(
        '2. Identify arithmetic operations without SafeMath or unchecked blocks',
        '3. Calculate input values that would cause overflow/underflow',
        '4. Call the vulnerable function with crafted overflow values',
        '5. Observe that the result wraps around to unexpected value',
        '6. Verify impact (infinite tokens, bypassed checks, negative balances)'
      );
      break;

    case 'BUSINESS_LOGIC':
      steps.push(
        '2. Analyze the business logic flow and identify edge cases',
        '3. Find sequence of operations that violates protocol invariants',
        '4. Execute the operations in the exploitable order',
        '5. Verify that protocol state is inconsistent or funds are extractable',
        `6. Specific issue: ${finding.description}`
      );
      break;

    case 'DOS_ATTACK':
      steps.push(
        '2. Identify loops over user-controlled arrays or external calls',
        '3. Populate array/mapping with many entries or deploy reverting contracts',
        '4. Call the vulnerable function and observe gas consumption',
        '5. Verify that function becomes unusable due to gas limits or reverts'
      );
      break;

    case 'TIMESTAMP_DEPENDENCE':
      steps.push(
        '2. Identify code that relies on block.timestamp for critical logic',
        '3. Note that miners can manipulate timestamp within ~15 second range',
        '4. Simulate attack by deploying on local chain with controlled timestamp',
        '5. Verify that outcome changes based on timestamp manipulation'
      );
      break;

    case 'WEAK_RANDOMNESS':
      steps.push(
        '2. Identify source of randomness (block.timestamp, blockhash, etc.)',
        '3. Calculate or predict the random value before transaction',
        '4. Submit transaction with foreknowledge of random outcome',
        '5. Verify that attacker can consistently win random-based rewards'
      );
      break;

    case 'TX_ORIGIN':
      steps.push(
        '2. Identify functions using tx.origin for authentication',
        '3. Deploy phishing contract that calls the vulnerable function',
        '4. Trick legitimate user into interacting with phishing contract',
        '5. Phishing contract calls vulnerable function with victims tx.origin',
        '6. Verify unauthorized action executed on behalf of victim'
      );
      break;

    case 'STORAGE_COLLISION':
      steps.push(
        '2. Identify proxy pattern or delegatecall usage',
        '3. Map storage slots between implementation and proxy contracts',
        '4. Find collision where different variables occupy same slot',
        '5. Call function that writes to colliding slot',
        '6. Verify that unintended variable was modified'
      );
      break;

    default:
      // Generic but more detailed steps
      steps.push(
        `2. Locate the vulnerable code at ${finding.filePath}:${finding.lineNumber || 'unknown'}`,
        `3. Analyze the vulnerability: ${finding.description}`,
        `4. ${finding.functionSelector ? `Call function ${finding.functionSelector} with crafted inputs` : 'Execute vulnerable code path with edge case inputs'}`,
        '5. Observe the vulnerability being exploited and verify impact',
        '6. Document the security impact and potential financial loss'
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
      return 'Multiple withdrawals executed before state update, allowing attacker to drain entire contract balance in single transaction';

    case 'ACCESS_CONTROL':
      return 'Unauthorized user able to execute privileged functions (withdraw, upgrade, pause), potentially taking full control of contract and funds';

    case 'ARBITRARY_SEND':
      return 'Funds sent to attacker-controlled address without proper validation, depleting contract balance';

    case 'DELEGATECALL':
      return 'Malicious contract able to modify storage variables including owner address, potentially taking permanent control of contract';

    case 'UNCHECKED_RETURN_VALUE':
      return 'Failed external call not detected, leading to inconsistent contract state where internal accounting differs from actual balances';

    case 'SELFDESTRUCT':
      return 'Contract can be destroyed by unauthorized user, causing permanent loss of all funds and protocol functionality';

    case 'TIMESTAMP_DEPENDENCE':
      return 'Contract behavior can be manipulated by miners adjusting block timestamp within allowed range (~15 seconds)';

    case 'TX_ORIGIN':
      return 'Phishing attack allows attacker to execute privileged transactions on behalf of victim who interacts with malicious contract';

    case 'WEAK_RANDOMNESS':
      return 'Predictable random values from block data allow attacker to consistently win lotteries or gaming outcomes';

    case 'UNINITIALIZED_STORAGE':
    case 'UNINITIALIZED_VARIABLE':
      return 'Uninitialized storage variables may contain attacker-controlled values from previous storage layout';

    case 'ORACLE_MANIPULATION':
      return 'Price oracle can be manipulated via flash loan + DEX swap, allowing attacker to borrow at manipulated prices, pay reduced fees, or trigger unfair liquidations. This is a critical DeFi vulnerability that caused $198M+ in losses in 2023';

    case 'FLASH_LOAN_ATTACK':
      return 'Flash loan enables attacker to temporarily access massive capital to manipulate protocol state, prices, or governance in single atomic transaction';

    case 'INTEGER_OVERFLOW':
      return 'Arithmetic overflow/underflow allows attacker to create tokens from nothing, bypass balance checks, or manipulate critical calculations';

    case 'BUSINESS_LOGIC':
      return 'Business logic flaw allows attacker to violate protocol invariants, extract value, or manipulate state in unintended ways';

    case 'DOS_ATTACK':
      return 'Denial of service renders critical contract functions unusable by exceeding gas limits or forcing reverts';

    case 'STORAGE_COLLISION':
      return 'Storage slot collision between proxy and implementation allows attacker to overwrite critical variables like owner address';

    case 'LOCKED_ETHER':
      return 'Ether sent to contract becomes permanently locked with no withdrawal mechanism';

    default:
      return `Vulnerability of type ${finding.vulnerabilityType} can be exploited: ${finding.description}. Impact depends on specific attack vector but may result in fund loss or protocol compromise.`;
  }
}
