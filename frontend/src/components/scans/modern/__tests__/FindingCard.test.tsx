import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FindingCard, Finding } from '../FindingCard';

const createMockFinding = (overrides?: Partial<Finding>): Finding => ({
  id: '1',
  vulnerabilityType: 'CWE-896: Reentrancy Vulnerability',
  severity: 'CRITICAL',
  description: 'The contract is vulnerable to reentrancy attacks in the withdraw function.',
  filePath: 'contracts/Vault.sol',
  lineNumber: 42,
  confidenceScore: 95,
  createdAt: '2024-02-04T10:00:00Z',
  ...overrides,
});

describe('FindingCard', () => {
  describe('Display finding severity badge', () => {
    it('displays red badge for CRITICAL severity', () => {
      const finding = createMockFinding({ severity: 'CRITICAL' });
      render(<FindingCard finding={finding} />);

      const badge = screen.getByText('CRITICAL');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-red-500/10');
      expect(badge.className).toContain('text-red-500');
      expect(badge.className).toContain('ring-red-500/30');
    });

    it('displays orange badge for HIGH severity', () => {
      const finding = createMockFinding({ severity: 'HIGH' });
      render(<FindingCard finding={finding} />);

      const badge = screen.getByText('HIGH');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-orange-500/10');
      expect(badge.className).toContain('text-orange-500');
      expect(badge.className).toContain('ring-orange-500/30');
    });

    it('displays yellow badge for MEDIUM severity', () => {
      const finding = createMockFinding({ severity: 'MEDIUM' });
      render(<FindingCard finding={finding} />);

      const badge = screen.getByText('MEDIUM');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-yellow-500/10');
      expect(badge.className).toContain('text-yellow-500');
      expect(badge.className).toContain('ring-yellow-500/30');
    });

    it('displays blue badge for LOW severity', () => {
      const finding = createMockFinding({ severity: 'LOW' });
      render(<FindingCard finding={finding} />);

      const badge = screen.getByText('LOW');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-blue-500/10');
      expect(badge.className).toContain('text-blue-500');
      expect(badge.className).toContain('ring-blue-500/30');
    });

    it('displays gray badge for INFO severity', () => {
      const finding = createMockFinding({ severity: 'INFO' });
      render(<FindingCard finding={finding} />);

      const badge = screen.getByText('INFO');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-gray-500/10');
      expect(badge.className).toContain('text-gray-500');
      expect(badge.className).toContain('ring-gray-500/30');
    });
  });

  describe('Display finding metadata', () => {
    it('displays CWE code in monospace font', () => {
      const finding = createMockFinding({
        vulnerabilityType: 'CWE-896: Reentrancy Vulnerability',
      });
      render(<FindingCard finding={finding} />);

      const cweCode = screen.getByText('CWE-896');
      expect(cweCode).toBeInTheDocument();
      expect(cweCode.className).toContain('font-mono');
      expect(cweCode.className).toContain('text-gray-400');
    });

    it('displays finding title in white bold text', () => {
      const finding = createMockFinding({
        vulnerabilityType: 'CWE-896: Reentrancy Vulnerability',
      });
      render(<FindingCard finding={finding} />);

      const title = screen.getByText('Reentrancy Vulnerability');
      expect(title).toBeInTheDocument();
      expect(title.className).toContain('text-white');
      expect(title.className).toContain('font-bold');
    });

    it('displays finding description in gray text', () => {
      const finding = createMockFinding();
      render(<FindingCard finding={finding} />);

      const description = screen.getByText(
        'The contract is vulnerable to reentrancy attacks in the withdraw function.'
      );
      expect(description).toBeInTheDocument();
      expect(description.className).toContain('text-gray-400');
      expect(description.className).toContain('line-clamp-2');
    });

    it('displays file path and line number in monospace font', () => {
      const finding = createMockFinding({
        filePath: 'contracts/Vault.sol',
        lineNumber: 42,
      });
      render(<FindingCard finding={finding} />);

      const filePath = screen.getByText('contracts/Vault.sol:42');
      expect(filePath).toBeInTheDocument();
      expect(filePath.className).toContain('font-mono');
    });

    it('displays file path without line number if not provided', () => {
      const finding = createMockFinding({
        filePath: 'contracts/Token.sol',
        lineNumber: undefined,
      });
      render(<FindingCard finding={finding} />);

      const filePath = screen.getByText('contracts/Token.sol');
      expect(filePath).toBeInTheDocument();
    });
  });

  describe('Display AI confidence meter', () => {
    it('displays confidence percentage', () => {
      const finding = createMockFinding({ confidenceScore: 95 });
      render(<FindingCard finding={finding} />);

      const percentage = screen.getByText('95%');
      expect(percentage).toBeInTheDocument();
      expect(percentage.className).toContain('text-white');
      expect(percentage.className).toContain('font-bold');
    });

    it('displays confidence label', () => {
      const finding = createMockFinding();
      render(<FindingCard finding={finding} />);

      const label = screen.getByText('AI Confidence');
      expect(label).toBeInTheDocument();
      expect(label.className).toContain('text-gray-400');
    });

    it('displays green gradient progress bar for high confidence (> 80%)', () => {
      const finding = createMockFinding({ confidenceScore: 85 });
      const { container } = render(<FindingCard finding={finding} />);

      const progressBar = container.querySelector('.bg-gradient-to-r.from-green-400.to-green-600');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ width: '85%' });
    });

    it('displays blue gradient progress bar for medium confidence (60-80%)', () => {
      const finding = createMockFinding({ confidenceScore: 70 });
      const { container } = render(<FindingCard finding={finding} />);

      const progressBar = container.querySelector('.bg-gradient-to-r.from-blue-500.to-cyan-500');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ width: '70%' });
    });

    it('displays yellow-orange gradient progress bar for low confidence (< 60%)', () => {
      const finding = createMockFinding({ confidenceScore: 55 });
      const { container } = render(<FindingCard finding={finding} />);

      const progressBar = container.querySelector('.bg-gradient-to-r.from-yellow-500.to-orange-500');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ width: '55%' });
    });
  });

  describe('Support finding card interactivity', () => {
    it('has hover state class', () => {
      const finding = createMockFinding();
      const { container } = render(<FindingCard finding={finding} />);

      const card = container.querySelector('[role="article"]');
      expect(card?.className).toContain('hover:bg-[#1f2b3e]');
      expect(card?.className).toContain('transition-all');
    });

    it('displays expand button with chevron-right icon', () => {
      const finding = createMockFinding();
      render(<FindingCard finding={finding} />);

      const expandButton = screen.getByLabelText('Expand finding details');
      expect(expandButton).toBeInTheDocument();

      const icon = expandButton.querySelector('.material-symbols-outlined');
      expect(icon?.textContent).toBe('chevron_right');
    });
  });

  describe('Provide accessible findings navigation', () => {
    it('has ARIA label with severity and title', () => {
      const finding = createMockFinding({
        severity: 'CRITICAL',
        vulnerabilityType: 'Reentrancy Vulnerability',
      });
      const { container } = render(<FindingCard finding={finding} />);

      const card = container.querySelector('[aria-label="CRITICAL: Reentrancy Vulnerability"]');
      expect(card).toBeInTheDocument();
    });

    it('uses semantic article role', () => {
      const finding = createMockFinding();
      const { container } = render(<FindingCard finding={finding} />);

      const article = container.querySelector('[role="article"]');
      expect(article).toBeInTheDocument();
    });
  });

  describe('Display findings in responsive layout', () => {
    it('applies responsive flex layout classes', () => {
      const finding = createMockFinding();
      const { container } = render(<FindingCard finding={finding} />);

      const layout = container.querySelector('.flex.flex-col.md\\:flex-row');
      expect(layout).toBeInTheDocument();
    });

    it('has border separator for mobile layout', () => {
      const finding = createMockFinding();
      const { container } = render(<FindingCard finding={finding} />);

      const separator = container.querySelector('.md\\:hidden.border-t');
      expect(separator).toBeInTheDocument();
    });
  });
});
