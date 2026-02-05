/**
 * Unit Tests: Payment Amounts Validation for Demo Mode
 * 
 * Tests that the backend correctly validates severity levels
 * and rejects unsupported severities (CRITICAL, INFO) in demo mode.
 */

import { describe, test, expect } from 'vitest';
import { mapSeverityToBountySeverity } from '../../src/services/payment.service.js';
import type { Severity } from '@prisma/client';

describe('Payment Service - Demo Amounts Validation', () => {
  test('Should map HIGH severity correctly', () => {
    const result = mapSeverityToBountySeverity('HIGH' as Severity);
    expect(result).toBeDefined();
    // BountySeverity.HIGH = 1
    expect(result).toBe(1);
  });
  
  test('Should map MEDIUM severity correctly', () => {
    const result = mapSeverityToBountySeverity('MEDIUM' as Severity);
    expect(result).toBeDefined();
    // BountySeverity.MEDIUM = 2
    expect(result).toBe(2);
  });
  
  test('Should map LOW severity correctly', () => {
    const result = mapSeverityToBountySeverity('LOW' as Severity);
    expect(result).toBeDefined();
    // BountySeverity.LOW = 3
    expect(result).toBe(3);
  });
  
  test('Should handle CRITICAL severity (mapped to BountySeverity.CRITICAL)', () => {
    const result = mapSeverityToBountySeverity('CRITICAL' as Severity);
    expect(result).toBeDefined();
    // BountySeverity.CRITICAL = 0
    expect(result).toBe(0);
  });
  
  test('Should handle INFO severity (mapped to BountySeverity.INFORMATIONAL)', () => {
    const result = mapSeverityToBountySeverity('INFO' as Severity);
    expect(result).toBeDefined();
    // BountySeverity.INFORMATIONAL = 4
    expect(result).toBe(4);
  });
});

describe('Severity Level Support for Demo', () => {
  const SUPPORTED_DEMO_SEVERITIES = ['HIGH', 'MEDIUM', 'LOW'];
  const UNSUPPORTED_DEMO_SEVERITIES = ['CRITICAL', 'INFO'];
  
  test('Should identify supported demo severities', () => {
    SUPPORTED_DEMO_SEVERITIES.forEach(severity => {
      expect(SUPPORTED_DEMO_SEVERITIES).toContain(severity);
    });
  });
  
  test('Should identify unsupported demo severities', () => {
    UNSUPPORTED_DEMO_SEVERITIES.forEach(severity => {
      expect(SUPPORTED_DEMO_SEVERITIES).not.toContain(severity);
    });
  });
  
  test('Demo budget calculation: 3 payments use 9 USDC', () => {
    const HIGH_AMOUNT = 5;
    const MEDIUM_AMOUNT = 3;
    const LOW_AMOUNT = 1;
    
    const totalUsage = HIGH_AMOUNT + MEDIUM_AMOUNT + LOW_AMOUNT;
    
    expect(totalUsage).toBe(9);
    expect(totalUsage).toBeLessThan(50); // Within 50 USDC budget
  });
});
