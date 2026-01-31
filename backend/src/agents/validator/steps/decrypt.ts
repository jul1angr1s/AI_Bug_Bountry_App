import { proofRepository } from '../../../db/repositories.js';

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
      // Use the finding's proof_data field if available
      const finding = await proofRepository.getFindingById(submission.findingId);

      if (!finding) {
        return {
          success: false,
          error: `Finding ${submission.findingId} not found`,
        };
      }

      // Extract proof data from finding
      proofData = finding.proofData || {
        vulnerabilityType: finding.issueType,
        severity: finding.severity,
        description: finding.description,
        location: {
          filePath: finding.filePath || 'unknown',
          lineNumber: finding.lineNumber,
          functionSelector: finding.functionName,
        },
        exploitDetails: {
          reproductionSteps: [
            'Deploy contract to local Anvil',
            'Execute vulnerable function',
            'Observe state changes',
          ],
          expectedOutcome: 'Contract should maintain invariants',
          actualOutcome: 'Invariants violated - ' + finding.description,
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
