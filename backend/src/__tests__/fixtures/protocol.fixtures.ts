export function createProtocolFixture(overrides: Partial<typeof baseProtocol> = {}) {
  return { ...baseProtocol, ...overrides };
}

const baseProtocol = {
  id: 'protocol-test-001',
  authUserId: 'user-test-001',
  ownerAddress: '0x1234567890abcdef1234567890abcdef12345678',
  githubUrl: 'https://github.com/test/protocol-repo',
  contractName: 'TestVault',
  contractPath: 'src/Vault.sol',
  status: 'ACTIVE',
  network: 'base-sepolia',
  onChainProtocolId: '0xprotocol123',
  createdAt: new Date('2026-01-10T08:00:00Z'),
  updatedAt: new Date('2026-01-10T08:00:00Z'),
};

export const unfundedProtocol = createProtocolFixture({
  id: 'protocol-test-002',
  onChainProtocolId: null,
  status: 'REGISTERED',
});

export const activeProtocol = createProtocolFixture({
  id: 'protocol-test-003',
  status: 'ACTIVE',
  onChainProtocolId: '0xprotocol456',
});

// Protocol with scans relation
export function createProtocolWithScans(protocolOverrides: Partial<typeof baseProtocol> = {}) {
  return {
    ...createProtocolFixture(protocolOverrides),
    scans: [
      {
        id: 'scan-test-001',
        protocolId: protocolOverrides.id || 'protocol-test-001',
        status: 'COMPLETED',
        createdAt: new Date('2026-01-12T10:00:00Z'),
        findings: [],
      },
    ],
  };
}
