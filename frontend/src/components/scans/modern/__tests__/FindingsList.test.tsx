import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FindingsList } from '../FindingsList';
import { Finding } from '../FindingCard';

const createMockFinding = (overrides?: Partial<Finding>): Finding => ({
  id: '1',
  vulnerabilityType: 'CWE-896: Reentrancy Vulnerability',
  severity: 'CRITICAL',
  description: 'The contract is vulnerable to reentrancy attacks.',
  filePath: 'contracts/Vault.sol',
  lineNumber: 42,
  confidenceScore: 95,
  createdAt: '2024-02-04T10:00:00Z',
  ...overrides,
});

describe('FindingsList', () => {
  describe('Section header display', () => {
    it('displays "Real-time Findings" title with warning icon', () => {
      render(<FindingsList findings={[]} />);

      const title = screen.getByText('Real-time Findings');
      expect(title).toBeInTheDocument();
      expect(title.className).toContain('font-semibold');
      expect(title.className).toContain('text-white');

      // Check for warning icon
      const icon = title.parentElement?.querySelector('.material-symbols-outlined');
      expect(icon?.textContent).toBe('warning');
      expect(icon?.className).toContain('text-yellow-500');
    });

    it('displays "Export Report" button when findings exist', () => {
      const findings = [createMockFinding()];
      const onExportReport = vi.fn();

      render(<FindingsList findings={findings} onExportReport={onExportReport} />);

      const exportButton = screen.getByText('Export Report');
      expect(exportButton).toBeInTheDocument();

      const downloadIcon = exportButton.parentElement?.querySelector('.material-symbols-outlined');
      expect(downloadIcon?.textContent).toBe('download');
    });

    it('does not display "Export Report" button when findings are empty', () => {
      const onExportReport = vi.fn();
      render(<FindingsList findings={[]} onExportReport={onExportReport} />);

      const exportButton = screen.queryByText('Export Report');
      expect(exportButton).not.toBeInTheDocument();
    });

    it('calls onExportReport when export button is clicked', () => {
      const findings = [createMockFinding()];
      const onExportReport = vi.fn();

      render(<FindingsList findings={findings} onExportReport={onExportReport} />);

      const exportButton = screen.getByText('Export Report');
      exportButton.closest('button')?.click();

      expect(onExportReport).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty state display', () => {
    it('displays empty state message when findings array is empty', () => {
      render(<FindingsList findings={[]} />);

      const emptyMessage = screen.getByText('No vulnerabilities detected yet');
      expect(emptyMessage).toBeInTheDocument();
      expect(emptyMessage.className).toContain('text-gray-400');
    });

    it('displays shield icon in empty state', () => {
      const { container } = render(<FindingsList findings={[]} />);

      // Find the icon within the empty state container
      const emptyState = container.querySelector('.py-12');
      const icon = emptyState?.querySelector('.material-symbols-outlined');
      expect(icon?.textContent).toBe('shield_with_heart');
      expect(icon?.className).toContain('text-gray-600');
    });

    it('displays helper text in empty state', () => {
      render(<FindingsList findings={[]} />);

      const helperText = screen.getByText(
        'The scan is in progress. Findings will appear here as they are discovered.'
      );
      expect(helperText).toBeInTheDocument();
      expect(helperText.className).toContain('text-gray-500');
    });
  });

  describe('Findings list rendering', () => {
    it('renders findings using FindingCard component', () => {
      const findings = [
        createMockFinding({ id: '1', vulnerabilityType: 'Reentrancy' }),
        createMockFinding({ id: '2', vulnerabilityType: 'Integer Overflow' }),
      ];

      render(<FindingsList findings={findings} />);

      // Check that both findings are rendered
      expect(screen.getByText('Reentrancy')).toBeInTheDocument();
      expect(screen.getByText('Integer Overflow')).toBeInTheDocument();
    });

    it('uses semantic HTML list structure', () => {
      const findings = [createMockFinding()];
      const { container } = render(<FindingsList findings={findings} />);

      const list = container.querySelector('[role="list"]');
      expect(list).toBeInTheDocument();

      const listItems = container.querySelectorAll('[role="listitem"]');
      expect(listItems).toHaveLength(1);
    });

    it('applies vertical layout with gap', () => {
      const findings = [createMockFinding(), createMockFinding({ id: '2' })];
      const { container } = render(<FindingsList findings={findings} />);

      const list = container.querySelector('.flex.flex-col.gap-3');
      expect(list).toBeInTheDocument();
    });
  });

  describe('Findings sorting', () => {
    it('sorts findings by severity (Critical → High → Medium → Low → Info)', () => {
      const findings = [
        createMockFinding({ id: '1', severity: 'LOW', createdAt: '2024-02-04T10:00:00Z' }),
        createMockFinding({ id: '2', severity: 'CRITICAL', createdAt: '2024-02-04T10:00:00Z' }),
        createMockFinding({ id: '3', severity: 'MEDIUM', createdAt: '2024-02-04T10:00:00Z' }),
        createMockFinding({ id: '4', severity: 'HIGH', createdAt: '2024-02-04T10:00:00Z' }),
        createMockFinding({ id: '5', severity: 'INFO', createdAt: '2024-02-04T10:00:00Z' }),
      ];

      const { container } = render(<FindingsList findings={findings} />);

      const badges = Array.from(container.querySelectorAll('.uppercase')).map(
        (badge) => badge.textContent
      );

      expect(badges).toEqual(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);
    });

    it('sorts findings by timestamp (newest first) within same severity', () => {
      const findings = [
        createMockFinding({
          id: '1',
          severity: 'HIGH',
          vulnerabilityType: 'Old Finding',
          createdAt: '2024-02-04T10:00:00Z',
        }),
        createMockFinding({
          id: '2',
          severity: 'HIGH',
          vulnerabilityType: 'New Finding',
          createdAt: '2024-02-04T12:00:00Z',
        }),
        createMockFinding({
          id: '3',
          severity: 'HIGH',
          vulnerabilityType: 'Middle Finding',
          createdAt: '2024-02-04T11:00:00Z',
        }),
      ];

      render(<FindingsList findings={findings} />);

      // Get all HIGH severity findings in order
      const titles = screen.getAllByText(/Finding$/);
      expect(titles[0]).toHaveTextContent('New Finding');
      expect(titles[1]).toHaveTextContent('Middle Finding');
      expect(titles[2]).toHaveTextContent('Old Finding');
    });

    it('combines severity and timestamp sorting correctly', () => {
      const findings = [
        createMockFinding({
          id: '1',
          severity: 'LOW',
          vulnerabilityType: 'Low 1',
          createdAt: '2024-02-04T14:00:00Z',
        }),
        createMockFinding({
          id: '2',
          severity: 'CRITICAL',
          vulnerabilityType: 'Critical 1',
          createdAt: '2024-02-04T10:00:00Z',
        }),
        createMockFinding({
          id: '3',
          severity: 'CRITICAL',
          vulnerabilityType: 'Critical 2',
          createdAt: '2024-02-04T12:00:00Z',
        }),
      ];

      const { container } = render(<FindingsList findings={findings} />);

      // Check order: Critical 2 (newest critical), Critical 1 (older critical), Low 1
      const listItems = container.querySelectorAll('[role="listitem"]');
      expect(listItems[0]).toHaveTextContent('Critical 2');
      expect(listItems[1]).toHaveTextContent('Critical 1');
      expect(listItems[2]).toHaveTextContent('Low 1');
    });
  });

  describe('Accessibility', () => {
    it('uses semantic heading for section title', () => {
      render(<FindingsList findings={[]} />);

      const heading = screen.getByRole('heading', { name: /Real-time Findings/i });
      expect(heading).toBeInTheDocument();
    });

    it('provides list role for findings container', () => {
      const findings = [createMockFinding()];
      const { container } = render(<FindingsList findings={findings} />);

      const list = container.querySelector('[role="list"]');
      expect(list).toBeInTheDocument();
    });

    it('provides listitem role for each finding', () => {
      const findings = [
        createMockFinding({ id: '1' }),
        createMockFinding({ id: '2' }),
      ];
      const { container } = render(<FindingsList findings={findings} />);

      const listItems = container.querySelectorAll('[role="listitem"]');
      expect(listItems).toHaveLength(2);
    });
  });
});
