import { PrismaClient, AgentType, AgentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function initializeAgents() {
  console.log('Initializing agent records...\n');

  // Create or update Researcher Agent
  const researcher = await prisma.agent.upsert({
    where: { id: 'researcher-agent-1' },
    update: {
      status: AgentStatus.ONLINE,
      lastHeartbeat: new Date(),
    },
    create: {
      id: 'researcher-agent-1',
      type: AgentType.RESEARCHER,
      status: AgentStatus.ONLINE,
      lastHeartbeat: new Date(),
      scansCompleted: 0,
    },
  });
  console.log('✅ Researcher Agent:', researcher.id, '-', researcher.status);

  // Create or update Protocol Agent
  const protocol = await prisma.agent.upsert({
    where: { id: 'protocol-agent-1' },
    update: {
      status: AgentStatus.ONLINE,
      lastHeartbeat: new Date(),
    },
    create: {
      id: 'protocol-agent-1',
      type: AgentType.PROTOCOL,
      status: AgentStatus.ONLINE,
      lastHeartbeat: new Date(),
      scansCompleted: 0,
    },
  });
  console.log('✅ Protocol Agent:', protocol.id, '-', protocol.status);

  // Create or update Validator Agent
  const validator = await prisma.agent.upsert({
    where: { id: 'validator-agent-1' },
    update: {
      status: AgentStatus.ONLINE,
      lastHeartbeat: new Date(),
    },
    create: {
      id: 'validator-agent-1',
      type: AgentType.VALIDATOR,
      status: AgentStatus.ONLINE,
      lastHeartbeat: new Date(),
      scansCompleted: 0,
    },
  });
  console.log('✅ Validator Agent:', validator.id, '-', validator.status);

  console.log('\n✅ All agents initialized successfully!');

  await prisma.$disconnect();
}

initializeAgents().catch((error) => {
  console.error('Error initializing agents:', error);
  process.exit(1);
});
