import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectProtocol() {
  const protocolId = '0acf0492-6607-45c9-9ac0-2cb900b8b723';

  const protocol = await prisma.protocol.findUnique({
    where: { id: protocolId },
  });

  if (!protocol) {
    console.log('Protocol not found');
    return;
  }

  console.log('\n=== Protocol Details ===\n');
  console.log(`ID: ${protocol.id}`);
  console.log(`GitHub URL: ${protocol.githubUrl}`);
  console.log(`Branch: ${protocol.branch}`);
  console.log(`Contract Path: ${protocol.contractPath}`);
  console.log(`Contract Name: ${protocol.contractName}`);
  console.log(`Status: ${protocol.status}`);
  console.log(`Registration State: ${protocol.registrationState}`);
  console.log(`Failure Reason: ${protocol.failureReason}`);
  console.log(`\nBounty Terms: ${protocol.bountyTerms}`);

  await prisma.$disconnect();
}

inspectProtocol().catch(console.error);
