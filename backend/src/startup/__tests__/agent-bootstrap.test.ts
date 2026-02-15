import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma, mockLogger } = vi.hoisted(() => {
  const mockPrisma = {
    agent: {
      upsert: vi.fn(),
    },
  };

  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  return { mockPrisma, mockLogger };
});

vi.mock('../../lib/prisma.js', () => ({
  getPrismaClient: () => mockPrisma,
}));

vi.mock('../../lib/logger.js', () => ({
  createLogger: () => mockLogger,
}));

import { bootstrapDefaultAgents } from '../agent-bootstrap.js';

describe('bootstrapDefaultAgents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AGENT_BOOTSTRAP_ENABLED;
    mockPrisma.agent.upsert.mockResolvedValue({});
  });

  it('upserts researcher, protocol, and validator agents', async () => {
    await bootstrapDefaultAgents();

    expect(mockPrisma.agent.upsert).toHaveBeenCalledTimes(3);
    expect(mockPrisma.agent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'researcher-agent-1' } })
    );
    expect(mockPrisma.agent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'protocol-agent-1' } })
    );
    expect(mockPrisma.agent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'validator-agent-1' } })
    );
  });

  it('skips bootstrap when disabled by env', async () => {
    process.env.AGENT_BOOTSTRAP_ENABLED = 'false';

    await bootstrapDefaultAgents();

    expect(mockPrisma.agent.upsert).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith('Skipped (AGENT_BOOTSTRAP_ENABLED=false)');
  });
});
