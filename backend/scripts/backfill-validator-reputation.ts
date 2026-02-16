import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillValidatorReputation() {
  console.log('\n=== Backfill Validator Reputation ===\n');

  // Get all feedback records grouped by validator
  const feedbackByValidator = await prisma.agentFeedback.groupBy({
    by: ['validatorAgentId', 'feedbackType'],
    where: {
      feedbackDirection: 'VALIDATOR_RATES_RESEARCHER',
    },
    _count: true,
  });

  // Aggregate counts per validator
  const validatorStats = new Map<string, { confirmed: number; rejected: number }>();

  for (const row of feedbackByValidator) {
    const stats = validatorStats.get(row.validatorAgentId) || { confirmed: 0, rejected: 0 };
    if (row.feedbackType === 'REJECTED') {
      stats.rejected += row._count;
    } else {
      stats.confirmed += row._count;
    }
    validatorStats.set(row.validatorAgentId, stats);
  }

  if (validatorStats.size === 0) {
    console.log('No validator feedback records found. Nothing to backfill.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found feedback for ${validatorStats.size} validator(s)\n`);

  for (const [validatorId, stats] of validatorStats) {
    const total = stats.confirmed + stats.rejected;
    const score = total > 0 ? Math.round((stats.confirmed * 100) / total) : 0;

    const agent = await prisma.agentIdentity.findUnique({
      where: { id: validatorId },
      select: { walletAddress: true, agentType: true },
    });

    console.log(`Validator ${validatorId} (${agent?.walletAddress ?? 'unknown'})`);
    console.log(`  Confirmed: ${stats.confirmed}, Rejected: ${stats.rejected}, Total: ${total}, Score: ${score}`);

    await prisma.agentReputation.update({
      where: { agentIdentityId: validatorId },
      data: {
        validatorConfirmedCount: stats.confirmed,
        validatorRejectedCount: stats.rejected,
        validatorTotalSubmissions: total,
        validatorReputationScore: score,
        validatorLastUpdated: new Date(),
      },
    });

    console.log(`  Updated successfully.\n`);
  }

  await prisma.$disconnect();
  console.log('Backfill complete.\n');
}

backfillValidatorReputation().catch((err) => {
  console.error('Backfill failed:', err);
  prisma.$disconnect();
  process.exit(1);
});
