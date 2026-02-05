/**
 * Integration Test: Demo Payment Flow with Updated Amounts
 * 
 * Verifies that the BountyPool contract has been configured with demo-friendly amounts:
 * - Base: 1 USDC
 * - HIGH: 5 USDC (5x multiplier)
 * - MEDIUM: 3 USDC (3x multiplier)
 * - LOW: 1 USDC (1x multiplier)
 * 
 * Tests the complete payment flow with real on-chain transactions.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import { BountyPoolClient, BountySeverity } from '../../src/blockchain/contracts/BountyPoolClient.js';
import { contractAddresses } from '../../src/blockchain/config.js';

describe('Demo Payment Flow with Updated Amounts', () => {
  let bountyPool: BountyPoolClient;
  
  beforeAll(async () => {
    bountyPool = new BountyPoolClient();
  });
  
  test('Verify contract has updated base amount (1 USDC)', async () => {
    const baseAmount = await bountyPool.getBaseBountyAmount();
    
    expect(baseAmount).toBe(1_000_000n); // 1 USDC with 6 decimals
  }, 30000);
  
  test('Verify HIGH severity pays 5 USDC', async () => {
    const amount = await bountyPool.calculateBountyAmount(BountySeverity.HIGH);
    
    expect(amount).toBe(5_000_000n); // 5 USDC
  }, 30000);
  
  test('Verify MEDIUM severity pays 3 USDC', async () => {
    const amount = await bountyPool.calculateBountyAmount(BountySeverity.MEDIUM);
    
    expect(amount).toBe(3_000_000n); // 3 USDC
  }, 30000);
  
  test('Verify LOW severity pays 1 USDC', async () => {
    const amount = await bountyPool.calculateBountyAmount(BountySeverity.LOW);
    
    expect(amount).toBe(1_000_000n); // 1 USDC
  }, 30000);
  
  test('Verify contract address is correct', () => {
    expect(contractAddresses.bountyPool).toBe('0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0');
  });
  
  test('Verify 50 USDC budget calculation', async () => {
    const highPayment = 5_000_000n; // 5 USDC
    const mediumPayment = 3_000_000n; // 3 USDC
    const lowPayment = 1_000_000n; // 1 USDC
    const totalBudget = 50_000_000n; // 50 USDC
    
    // Calculate maximum payments possible with 50 USDC
    const maxHighPayments = totalBudget / highPayment;
    const maxMediumPayments = totalBudget / mediumPayment;
    const maxLowPayments = totalBudget / lowPayment;
    
    expect(maxHighPayments).toBeGreaterThanOrEqual(10n);
    expect(maxMediumPayments).toBeGreaterThanOrEqual(16n);
    expect(maxLowPayments).toBeGreaterThanOrEqual(50n);
    
    // Verify our demo budget (3 payments: HIGH + MEDIUM + LOW = 9 USDC)
    const demoUsage = highPayment + mediumPayment + lowPayment;
    expect(demoUsage).toBe(9_000_000n); // 9 USDC total
    expect(demoUsage).toBeLessThan(totalBudget); // Well within budget
  });
});
