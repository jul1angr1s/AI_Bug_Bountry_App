const usedSiweNonces = new Map<string, number>();

type ParsedSiweMessage = {
  domain: string;
  address: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
};

function getAllowedDomains(): Set<string> {
  const domains = new Set<string>(['localhost:5173', '127.0.0.1:5173']);
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) {
    try {
      domains.add(new URL(frontendUrl).host.toLowerCase());
    } catch {
      // ignore malformed URL - env validation handles this elsewhere
    }
  }

  const custom = process.env.SIWE_ALLOWED_DOMAINS;
  if (custom) {
    custom
      .split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean)
      .forEach((domain) => domains.add(domain));
  }

  return domains;
}

function getAllowedChainIds(): Set<number> {
  const raw = process.env.SIWE_ALLOWED_CHAIN_IDS || '84532,31337';
  return new Set(
    raw
      .split(',')
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => Number.isFinite(value) && value > 0)
  );
}

function parseSiweMessage(message: string): ParsedSiweMessage | null {
  const lines = message.split('\n');
  const firstLine = lines[0]?.trim();
  const addressLine = lines[1]?.trim();
  const firstMatch = firstLine?.match(/^(.+?) wants you to sign in with your Ethereum account:$/);

  if (!firstMatch || !addressLine) {
    return null;
  }

  const field = (name: string): string | undefined => {
    const match = message.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
    return match?.[1]?.trim();
  };

  const uri = field('URI');
  const version = field('Version');
  const chainIdRaw = field('Chain ID');
  const nonce = field('Nonce');
  const issuedAt = field('Issued At');
  const expirationTime = field('Expiration Time');

  if (!uri || !version || !chainIdRaw || !nonce || !issuedAt) {
    return null;
  }

  const chainId = Number.parseInt(chainIdRaw, 10);
  if (!Number.isFinite(chainId)) {
    return null;
  }

  return {
    domain: firstMatch[1].toLowerCase(),
    address: addressLine.toLowerCase(),
    uri,
    version,
    chainId,
    nonce,
    issuedAt,
    expirationTime,
  };
}

function pruneUsedNonces(nowMs: number): void {
  for (const [nonce, expiresAt] of usedSiweNonces.entries()) {
    if (expiresAt <= nowMs) {
      usedSiweNonces.delete(nonce);
    }
  }
}

export function isSiweNonceReplay(nonce: string): boolean {
  const nowMs = Date.now();
  pruneUsedNonces(nowMs);
  const expiresAt = usedSiweNonces.get(nonce);
  return typeof expiresAt === 'number' && expiresAt > nowMs;
}

export function rememberSiweNonce(nonce: string): void {
  const nowMs = Date.now();
  const maxAgeSeconds = Number.parseInt(process.env.SIWE_MAX_AGE_SECONDS || '600', 10);
  const ttlMs = (Number.isFinite(maxAgeSeconds) ? maxAgeSeconds : 600) * 1000;
  usedSiweNonces.set(nonce, nowMs + ttlMs);
}

export function validateSiweMessageSemantics(
  message: string,
  expectedWalletAddress: string
): { ok: true; nonce: string } | { ok: false } {
  const parsed = parseSiweMessage(message);
  if (!parsed) {
    return { ok: false };
  }

  const allowedDomains = getAllowedDomains();
  if (!allowedDomains.has(parsed.domain)) {
    return { ok: false };
  }

  const expectedAddress = expectedWalletAddress.toLowerCase();
  if (parsed.address !== expectedAddress) {
    return { ok: false };
  }

  const allowedChainIds = getAllowedChainIds();
  if (!allowedChainIds.has(parsed.chainId)) {
    return { ok: false };
  }

  const issuedAtMs = Date.parse(parsed.issuedAt);
  if (!Number.isFinite(issuedAtMs)) {
    return { ok: false };
  }

  const nowMs = Date.now();
  const maxAgeSeconds = Number.parseInt(process.env.SIWE_MAX_AGE_SECONDS || '600', 10);
  const maxAgeMs = (Number.isFinite(maxAgeSeconds) ? maxAgeSeconds : 600) * 1000;
  const allowedFutureSkewMs = 2 * 60 * 1000; // 2 min clock skew tolerance

  if (issuedAtMs > nowMs + allowedFutureSkewMs) {
    return { ok: false };
  }

  if (nowMs - issuedAtMs > maxAgeMs) {
    return { ok: false };
  }

  if (parsed.expirationTime) {
    const expiresMs = Date.parse(parsed.expirationTime);
    if (!Number.isFinite(expiresMs) || nowMs > expiresMs + allowedFutureSkewMs) {
      return { ok: false };
    }
  }

  return { ok: true, nonce: parsed.nonce };
}
