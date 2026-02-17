import { getPrismaClient } from './src/lib/prisma.js';
import { bootstrapDefaultAgents } from './src/startup/agent-bootstrap.js';

async function initializeAgents() {
  console.log('Initializing agent records...\n');
  await bootstrapDefaultAgents();

  console.log('\n✅ All agents initialized successfully!');

  await getPrismaClient().$disconnect();
}

initializeAgents().catch((error) => {
  console.error('Error initializing agents:', error);
  process.exit(1);
});
