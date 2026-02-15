import crypto from 'crypto';

export interface ProtocolFingerprintInput {
  ownerAddress?: string;
  githubUrl?: string;
  branch?: string;
  contractPath?: string;
  contractName?: string;
}

function normalize(input: string | undefined): string {
  return (input || '').trim();
}

/**
 * Deterministic fingerprint for protocol registration payloads.
 * Used to allow safe payment retries without charging twice.
 */
export function buildProtocolRegistrationFingerprint(
  input: ProtocolFingerprintInput
): string | null {
  const ownerAddress = normalize(input.ownerAddress).toLowerCase();
  const githubUrl = normalize(input.githubUrl).toLowerCase();
  const branch = normalize(input.branch).toLowerCase();
  const contractPath = normalize(input.contractPath);
  const contractName = normalize(input.contractName);

  if (!ownerAddress || !githubUrl || !branch || !contractPath || !contractName) {
    return null;
  }

  const payload = [ownerAddress, githubUrl, branch, contractPath, contractName].join('|');
  return crypto.createHash('sha256').update(payload).digest('hex');
}
