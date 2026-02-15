import { AgentStatus, AgentType } from '@prisma/client';
import { getPrismaClient } from '../lib/prisma.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('AgentBootstrap');

type DefaultAgent = {
  id: string;
  type: AgentType;
};

const DEFAULT_AGENTS: DefaultAgent[] = [
  { id: 'researcher-agent-1', type: AgentType.RESEARCHER },
  { id: 'protocol-agent-1', type: AgentType.PROTOCOL },
  { id: 'validator-agent-1', type: AgentType.VALIDATOR },
];

export async function bootstrapDefaultAgents(): Promise<void> {
  if (process.env.AGENT_BOOTSTRAP_ENABLED === 'false') {
    log.info('Skipped (AGENT_BOOTSTRAP_ENABLED=false)');
    return;
  }

  const prisma = getPrismaClient();
  log.info({ agents: DEFAULT_AGENTS.length }, 'Starting default agent bootstrap');

  for (const agent of DEFAULT_AGENTS) {
    await prisma.agent.upsert({
      where: { id: agent.id },
      update: {
        status: AgentStatus.ONLINE,
        lastHeartbeat: new Date(),
      },
      create: {
        id: agent.id,
        type: agent.type,
        status: AgentStatus.ONLINE,
        lastHeartbeat: new Date(),
        scansCompleted: 0,
      },
    });
  }

  log.info(
    {
      researcher: 1,
      protocol: 1,
      validator: 1,
    },
    'Default agent bootstrap completed'
  );
}
