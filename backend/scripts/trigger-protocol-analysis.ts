#!/usr/bin/env tsx

/**
 * Script to manually trigger protocol analysis for a protocol
 * Usage: tsx scripts/trigger-protocol-analysis.ts <protocol-id>
 */

import { addProtocolRegistrationJob } from '../src/queues/protocol.queue.js';

const protocolId = process.argv[2];

if (!protocolId) {
  console.error('Usage: tsx scripts/trigger-protocol-analysis.ts <protocol-id>');
  process.exit(1);
}

console.log(`Triggering protocol analysis for: ${protocolId}`);

try {
  await addProtocolRegistrationJob(protocolId);
  console.log('✅ Protocol analysis job added to queue successfully');
  console.log('The Protocol Agent will process it shortly');
  process.exit(0);
} catch (error) {
  console.error('❌ Failed to add protocol analysis job:', error);
  process.exit(1);
}
