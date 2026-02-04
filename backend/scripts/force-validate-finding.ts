#!/usr/bin/env npx tsx
/**
 * Force Validate Finding - Demo Script
 * 
 * This script manually validates a finding to trigger the payment workflow.
 * Use for demonstration purposes only.
 */

import { PrismaClient } from '@prisma/client';
import { getValidationService } from '../src/services/validation.service.js';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Force Validate Finding for Demo ===\n');

  // Get a finding that is currently REJECTED (or PENDING)
  const finding = await prisma.finding.findFirst({
    where: {
      OR: [
        { status: 'REJECTED' },
        { status: 'PENDING' },
      ],
    },
    include: {
      scan: {
        include: {
          protocol: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!finding) {
    console.log('No findings available to validate.');
    console.log('Run a scan first to generate findings.');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('Found finding to validate:');
  console.log(`  ID: ${finding.id}`);
  console.log(`  Type: ${finding.vulnerabilityType}`);
  console.log(`  Severity: ${finding.severity}`);
  console.log(`  Current Status: ${finding.status}`);
  console.log(`  Protocol: ${finding.scan.protocol.githubUrl}`);
  console.log();

  // Get validation service
  const validationService = getValidationService();

  // Force validate the finding
  console.log('Validating finding...');
  
  await validationService.validateFinding(finding.id, {
    isValid: true,
    confidence: 95,
    reasoning: '[DEMO] Manually validated for demonstration purposes',
    severity: finding.severity,
    exploitability: 'High',
  });

  console.log('\n✅ Finding validated successfully!');
  
  // Wait a moment for async payment creation
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check if payment was created - look for vulnerability linked to this finding
  const vulnerability = await prisma.vulnerability.findFirst({
    where: {
      protocolId: finding.scan.protocolId,
    },
    orderBy: {
      discoveredAt: 'desc',
    },
  });

  const payment = vulnerability ? await prisma.payment.findFirst({
    where: {
      vulnerabilityId: vulnerability.id,
    },
  }) : null;

  if (payment) {
    console.log('\n💰 Payment record created:');
    console.log(`  Payment ID: ${payment.id}`);
    console.log(`  Amount: $${payment.amount} ${payment.currency}`);
    console.log(`  Researcher: ${payment.researcherAddress}`);
    console.log(`  Status: ${payment.status}`);
    console.log('\nThe payment job has been queued for processing.');
    console.log('Check the backend logs for payment execution status.');
  } else {
    console.log('\n⚠️ No payment record found. Check for errors in the logs.');
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
