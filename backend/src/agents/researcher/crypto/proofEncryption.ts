import crypto from 'crypto';

/**
 * Proof Encryption Module (Task 4.1)
 * 
 * Handles encryption of vulnerability proofs for Validator Agent
 * and researcher signing of proofs.
 */

// TODO: In production, load from secure key management (AWS KMS, HashiCorp Vault, etc.)
const ENCRYPTION_KEY = process.env.PROOF_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

export interface ProofPayload {
  vulnerabilityId: string;
  exploit: string;
  expectedOutcome: string;
  researcherAddress: string;
  timestamp: string;
}

export interface EncryptedProof {
  encryptedData: string;
  iv: string;
  authTag: string;
  researcherSignature: string;
  researcherPublicKey: string;
}

/**
 * Encrypt proof payload for Validator Agent
 */
export function encryptProof(
  payload: ProofPayload,
  validatorPublicKey: string
): EncryptedProof {
  // Generate researcher key pair for signing
  const researcherKeyPair = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
  });

  // Serialize payload
  const payloadString = JSON.stringify(payload);
  
  // Sign payload with researcher private key
  const signature = crypto.sign(
    'sha256',
    Buffer.from(payloadString),
    researcherKeyPair.privateKey
  );

  // Encrypt payload (using AES-256-GCM)
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );
  
  let encryptedData = cipher.update(payloadString, 'utf8', 'hex');
  encryptedData += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();

  return {
    encryptedData,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    researcherSignature: signature.toString('hex'),
    researcherPublicKey: researcherKeyPair.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}

/**
 * Decrypt proof (for Validator Agent)
 */
export function decryptProof(encryptedProof: EncryptedProof): {
  payload: ProofPayload;
  isValid: boolean;
} {
  // Decrypt payload
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(encryptedProof.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(encryptedProof.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedProof.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  const payload: ProofPayload = JSON.parse(decrypted);
  
  // Verify researcher signature
  const publicKey = crypto.createPublicKey(encryptedProof.researcherPublicKey);
  const isValid = crypto.verify(
    'sha256',
    Buffer.from(decrypted),
    publicKey,
    Buffer.from(encryptedProof.researcherSignature, 'hex')
  );

  return { payload, isValid };
}

/**
 * Verify proof hasn't been tampered with
 */
export function verifyProofIntegrity(
  encryptedProof: EncryptedProof,
  expectedResearcherAddress: string
): boolean {
  try {
    const { payload, isValid } = decryptProof(encryptedProof);
    
    // Check signature validity and researcher identity
    return isValid && payload.researcherAddress === expectedResearcherAddress;
  } catch (error) {
    return false;
  }
}

/**
 * Generate vulnerability hash for deduplication
 */
export function generateVulnerabilityHash(
  chainId: number,
  contractAddress: string,
  vulnerabilityType: string,
  functionSelector: string
): string {
  return crypto
    .createHash('sha256')
    .update(
      `${chainId}:${contractAddress}:${vulnerabilityType}:${functionSelector}`
    )
    .digest('hex');
}
