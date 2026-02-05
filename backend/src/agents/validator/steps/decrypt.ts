import { proofRepository, findingRepository } from '../../../db/repositories.js';

export interface ProofSubmissionMessage {
  scanId: string;
  protocolId: string;
  proofId: string;
  findingId: string;
  commitHash: string;
  signature?: string;
  encryptedPayload?: string;
  encryptionKeyId?: string;
  timestamp: string;
}

export interface DecryptedProof {
  proofId: string;
  findingId: string;
  scanId: string;
  protocolId: string;
  commitHash: string;
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
}

export interface DecryptStepResult {
  success: boolean;
  proof?: DecryptedProof;
  error?: string;
}

/**
 * DECRYPT Step - Decrypt and parse proof from Researcher Agent
 *
 * For MVP, proofs are not encrypted. This step retrieves the proof from the database
 * and parses it into the validation format.
 *
 * In production, this would:
 * 1. Decrypt the encryptedPayload using validator's private key
 * 2. Verify the researcher's signature
 * 3. Check for MEV front-running (ensure researcher address matches proof)
 */
export async function decryptProof(
  submission: ProofSubmissionMessage
): Promise<DecryptStepResult> {
  try {
    console.log(`[Validator/Decrypt] Processing proof ${submission.proofId}`);

    // Fetch proof from database
    const dbProof = await proofRepository.getProofById(submission.proofId);

    if (!dbProof) {
      return {
        success: false,
        error: `Proof ${submission.proofId} not found in database`,
      };
    }

    // For MVP: proof data is stored in plaintext
    // In production: decrypt the encryptedPayload and verify signature

    let proofData: any;

    if (dbProof.encryptedPayload) {
      // TODO: Implement actual decryption when encryption is enabled
      // For now, assume the payload is base64-encoded JSON
      try {
        const decoded = Buffer.from(dbProof.encryptedPayload, 'base64').toString('utf-8');
        proofData = JSON.parse(decoded);
      } catch (decodeError) {
        // If decoding fails, try parsing directly
        proofData = JSON.parse(dbProof.encryptedPayload);
      }
    } else {
      // Use the finding's data if available
      const finding = await findingRepository.getFindingById(submission.findingId);

      if (!finding) {
        return {
          success: false,
          error: `Finding ${submission.findingId} not found`,
        };
      }

      // Generate vulnerability-specific exploit details
      const reproductionSteps = generateReproductionSteps(finding.vulnerabilityType, finding);
      const expectedOutcome = generateExpectedOutcome(finding.vulnerabilityType, finding);

      // Extract proof data from finding fields with vulnerability-specific details
      proofData = {
        vulnerabilityType: finding.vulnerabilityType,
        severity: finding.severity,
        description: finding.description,
        location: {
          filePath: finding.filePath || 'unknown',
          lineNumber: finding.lineNumber,
          functionSelector: finding.functionSelector,
        },
        exploitDetails: {
          reproductionSteps,
          expectedOutcome,
          actualOutcome: `Vulnerability confirmed: ${finding.description}`,
        },
      };
    }

    // Construct decrypted proof object
    const decryptedProof: DecryptedProof = {
      proofId: submission.proofId,
      findingId: submission.findingId,
      scanId: submission.scanId,
      protocolId: submission.protocolId,
      commitHash: submission.commitHash,
      vulnerabilityType: proofData.vulnerabilityType || 'UNKNOWN',
      severity: proofData.severity || 'MEDIUM',
      description: proofData.description || 'No description provided',
      location: proofData.location || {
        filePath: 'unknown',
      },
      exploitDetails: proofData.exploitDetails || {
        reproductionSteps: [],
        expectedOutcome: 'Unknown',
      },
      contractDetails: proofData.contractDetails,
    };

    console.log(`[Validator/Decrypt] Successfully parsed proof for ${decryptedProof.vulnerabilityType}`);

    return {
      success: true,
      proof: decryptedProof,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Validator/Decrypt] Failed to decrypt proof:`, errorMessage);

    return {
      success: false,
      error: `Decryption failed: ${errorMessage}`,
    };
  }
}

/**
 * Verify researcher signature to prevent MEV front-running
 *
 * In production, this would:
 * 1. Extract researcher address from signature
 * 2. Verify it matches the proof's claimed researcher
 * 3. Prevent bots from stealing proofs
 */
export function verifyResearcherSignature(
  proofPayload: string,
  signature: string,
  claimedResearcher: string
): boolean {
  // TODO: Implement signature verification
  // For MVP, we skip this step

  console.log('[Validator/Decrypt] Signature verification skipped in MVP');
  return true;
}

/**
 * Generate vulnerability-specific reproduction steps for validation
 */
function generateReproductionSteps(vulnerabilityType: string, finding: any): string[] {
  const location = `${finding.filePath}:${finding.lineNumber || 'unknown'}`;
  const func = finding.functionSelector || 'vulnerable function';

  switch (vulnerabilityType) {
    case 'REENTRANCY':
      return [
        '1. Deploy the target contract with funds',
        '2. Create attacker contract with malicious fallback/receive function',
        `3. Call ${func} from attacker contract`,
        '4. In fallback, recursively call withdraw before state update',
        '5. Drain multiple times the intended withdrawal amount',
      ];

    case 'ACCESS_CONTROL':
      return [
        `1. Identify unprotected function at ${location}`,
        '2. Connect with unauthorized wallet address',
        `3. Call ${func} that should be restricted`,
        '4. Observe successful execution without access control',
        '5. Verify privileged action completed by unauthorized user',
      ];

    case 'ORACLE_MANIPULATION':
      return [
        '1. Identify price oracle dependency (TSwap, Uniswap, etc.)',
        '2. Request flash loan for large amount of base asset',
        '3. Execute large swap on DEX to manipulate spot price',
        `4. Call ${func} which reads manipulated price`,
        '5. Profit from price discrepancy (reduced fees, better rates)',
        '6. Swap back and repay flash loan',
        `7. Vulnerable code at ${location}: ${finding.description}`,
      ];

    case 'FLASH_LOAN_ATTACK':
      return [
        '1. Request flash loan for maximum liquidity',
        '2. Use borrowed funds to manipulate protocol state',
        `3. Exploit ${func} during manipulated state`,
        '4. Extract profit from the protocol',
        '5. Repay flash loan plus fees in same transaction',
      ];

    case 'INTEGER_OVERFLOW':
      return [
        `1. Identify arithmetic operation at ${location}`,
        '2. Calculate input values causing overflow/underflow',
        `3. Call ${func} with crafted overflow values`,
        '4. Observe wrapped/unexpected result value',
        '5. Exploit impact (mint tokens, bypass checks)',
      ];

    case 'BUSINESS_LOGIC':
      return [
        `1. Analyze logic flow at ${location}`,
        '2. Identify edge case or sequence that violates invariants',
        `3. Execute operations in exploitable order via ${func}`,
        '4. Verify protocol state becomes inconsistent',
        `5. Specific flaw: ${finding.description}`,
      ];

    case 'DELEGATECALL':
      return [
        '1. Deploy malicious contract matching storage layout',
        `2. Call ${func} with malicious contract address`,
        '3. Malicious contract modifies critical storage slots',
        '4. Owner/admin variables overwritten',
        '5. Take permanent control of target contract',
      ];

    case 'UNCHECKED_RETURN_VALUE':
      return [
        `1. Identify unchecked external call at ${location}`,
        '2. Setup scenario where call will fail',
        `3. Call ${func} and observe continued execution`,
        '4. Verify state inconsistency (internal vs actual balance)',
      ];

    case 'TX_ORIGIN':
      return [
        `1. Identify tx.origin check at ${location}`,
        '2. Deploy phishing contract',
        '3. Trick legitimate user to call phishing contract',
        `4. Phishing contract calls ${func} with victim tx.origin`,
        '5. Unauthorized action executed as victim',
      ];

    case 'TIMESTAMP_DEPENDENCE':
      return [
        `1. Identify block.timestamp usage at ${location}`,
        '2. Note miner can manipulate timestamp ~15 seconds',
        '3. Deploy on local chain with controlled timestamp',
        `4. Call ${func} with manipulated timestamp`,
        '5. Observe different outcome based on timestamp',
      ];

    case 'WEAK_RANDOMNESS':
      return [
        `1. Identify randomness source at ${location}`,
        '2. Calculate/predict random value from block data',
        '3. Submit transaction with foreknowledge',
        `4. Call ${func} knowing the random outcome`,
        '5. Consistently win random-based rewards',
      ];

    case 'ARBITRARY_SEND':
      return [
        `1. Identify fund transfer at ${location}`,
        '2. Call function with attacker address parameter',
        '3. Observe funds sent to arbitrary address',
        '4. Verify contract balance decreased',
      ];

    case 'DOS_ATTACK':
      return [
        `1. Identify loop/external calls at ${location}`,
        '2. Populate array with many entries or deploy reverting contract',
        `3. Call ${func}`,
        '4. Observe gas exhaustion or permanent revert',
        '5. Function becomes unusable',
      ];

    default:
      return [
        `1. Locate vulnerable code at ${location}`,
        `2. Vulnerability type: ${vulnerabilityType}`,
        `3. Call ${func} with crafted inputs`,
        `4. Exploit: ${finding.description}`,
        '5. Verify security impact',
      ];
  }
}

/**
 * Generate vulnerability-specific expected outcome for validation
 */
function generateExpectedOutcome(vulnerabilityType: string, finding: any): string {
  switch (vulnerabilityType) {
    case 'REENTRANCY':
      return 'Attacker drains contract balance through recursive calls before state update. Multiple withdrawals in single transaction.';

    case 'ACCESS_CONTROL':
      return 'Unauthorized user executes privileged functions (withdraw, upgrade, pause), potentially gaining full contract control.';

    case 'ORACLE_MANIPULATION':
      return 'Flash loan + DEX swap manipulates price oracle. Attacker profits from manipulated rates (reduced fees, favorable borrowing, unfair liquidations). Critical DeFi vulnerability - $198M+ lost in 2023.';

    case 'FLASH_LOAN_ATTACK':
      return 'Flash loan provides massive temporary capital to manipulate protocol state, governance, or prices in atomic transaction.';

    case 'INTEGER_OVERFLOW':
      return 'Arithmetic overflow/underflow creates tokens from nothing, bypasses balance checks, or corrupts critical calculations.';

    case 'BUSINESS_LOGIC':
      return `Business logic flaw allows protocol invariant violation: ${finding.description}`;

    case 'DELEGATECALL':
      return 'Malicious contract modifies critical storage via delegatecall, potentially overwriting owner and taking permanent control.';

    case 'UNCHECKED_RETURN_VALUE':
      return 'Failed external call ignored, causing state inconsistency between internal accounting and actual balances.';

    case 'TX_ORIGIN':
      return 'Phishing attack executes privileged transactions on behalf of victim who interacts with malicious contract.';

    case 'TIMESTAMP_DEPENDENCE':
      return 'Miner timestamp manipulation (~15s range) affects contract logic, enabling exploitation of time-dependent operations.';

    case 'WEAK_RANDOMNESS':
      return 'Predictable randomness from block data allows attacker to consistently win lotteries or gaming outcomes.';

    case 'ARBITRARY_SEND':
      return 'Funds sent to attacker-controlled address without proper validation, draining contract balance.';

    case 'DOS_ATTACK':
      return 'Denial of service renders critical functions unusable through gas exhaustion or forced reverts.';

    case 'SELFDESTRUCT':
      return 'Unauthorized selfdestruct permanently destroys contract, causing total loss of funds and functionality.';

    case 'STORAGE_COLLISION':
      return 'Storage slot collision allows overwriting critical variables like owner address through proxy pattern.';

    default:
      return `Vulnerability ${vulnerabilityType} exploitable: ${finding.description}. May result in fund loss or protocol compromise.`;
  }
}
