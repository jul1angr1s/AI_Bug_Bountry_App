import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ScanDashboardHeader } from '../ScanDashboardHeader';
import * as api from '../../../../lib/api';
import { toast } from 'sonner';

// Mock the API module
vi.mock('../../../../lib/api', () => ({
  cancelScan: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ScanDashboardHeader', () => {
  const mockScanRunning = {
    id: 'scan-123',
    protocolId: 'protocol-456',
    state: 'RUNNING' as const,
    currentStep: 'ANALYZE',
    startedAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(), // 14 minutes ago
    protocol: {
      id: 'protocol-456',
      githubUrl: 'https://github.com/uniswap/v3-core',
      contractName: 'Uniswap V3',
    },
  };

  const mockScanCompleted = {
    ...mockScanRunning,
    state: 'SUCCEEDED' as const,
  };

  const mockContractAddress = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Status Badge', () => {
    it('displays "Active Scan" badge for RUNNING state with pulsing animation', () => {
      const { container } = render(<ScanDashboardHeader scan={mockScanRunning} />);

      const badge = screen.getByText('Active Scan');
      expect(badge).toBeInTheDocument();

      // Find the badge container div
      const badgeContainer = container.querySelector('.bg-green-500\\/20');
      expect(badgeContainer).toHaveClass('bg-green-500/20', 'text-green-400', 'border-green-500/30');

      // Check for pulsing dot
      const pulsingDot = container.querySelector('.animate-ping');
      expect(pulsingDot).toBeInTheDocument();
    });

    it('displays "Queued" badge for QUEUED state without pulse', () => {
      const queuedScan = { ...mockScanRunning, state: 'QUEUED' as const };
      const { container } = render(<ScanDashboardHeader scan={queuedScan} />);

      const badge = screen.getByText('Queued');
      expect(badge).toBeInTheDocument();

      const badgeContainer = container.querySelector('.bg-yellow-500\\/20');
      expect(badgeContainer).toHaveClass('bg-yellow-500/20', 'text-yellow-400');

      // No pulsing dot for queued state
      const pulsingDot = container.querySelector('.animate-ping');
      expect(pulsingDot).not.toBeInTheDocument();
    });

    it('displays "Completed" badge for SUCCEEDED state', () => {
      const { container } = render(<ScanDashboardHeader scan={mockScanCompleted} />);

      const badge = screen.getByText('Completed');
      expect(badge).toBeInTheDocument();

      const badgeContainer = container.querySelector('.bg-gray-500\\/20');
      expect(badgeContainer).toHaveClass('bg-gray-500/20', 'text-gray-400');
    });

    it('displays "Failed" badge for FAILED state', () => {
      const failedScan = { ...mockScanRunning, state: 'FAILED' as const };
      const { container } = render(<ScanDashboardHeader scan={failedScan} />);

      const badge = screen.getByText('Failed');
      expect(badge).toBeInTheDocument();

      const badgeContainer = container.querySelector('.bg-red-500\\/20');
      expect(badgeContainer).toHaveClass('bg-red-500/20', 'text-red-400');
    });

    it('displays "Canceled" badge for CANCELED state', () => {
      const canceledScan = { ...mockScanRunning, state: 'CANCELED' as const };
      render(<ScanDashboardHeader scan={canceledScan} />);

      const badge = screen.getByText('Canceled');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Scan ID Display', () => {
    it('displays scan ID in monospace font with correct format', () => {
      render(<ScanDashboardHeader scan={mockScanRunning} />);

      const scanId = screen.getByText('#SCAN-scan-123');
      expect(scanId).toBeInTheDocument();
      expect(scanId).toHaveClass('font-mono');
    });

    it('truncates long scan IDs to 8 characters after prefix', () => {
      const longIdScan = {
        ...mockScanRunning,
        id: 'very-long-scan-id-12345678',
      };
      render(<ScanDashboardHeader scan={longIdScan} />);

      const scanId = screen.getByText('#SCAN-very-lon');
      expect(scanId).toBeInTheDocument();
    });
  });

  describe('Protocol Name', () => {
    it('displays protocol name as main heading', () => {
      render(<ScanDashboardHeader scan={mockScanRunning} />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Uniswap V3');
      expect(heading).toHaveClass('text-3xl', 'font-bold');
    });

    it('displays "Unknown Protocol" when protocol data is missing', () => {
      const scanNoProtocol = {
        ...mockScanRunning,
        protocol: undefined,
      };
      render(<ScanDashboardHeader scan={scanNoProtocol} />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Unknown Protocol');
    });
  });

  describe('Contract Address', () => {
    it('displays truncated contract address when provided', () => {
      render(
        <ScanDashboardHeader
          scan={mockScanRunning}
          contractAddress={mockContractAddress}
        />
      );

      const address = screen.getByText('0x1f98...f984');
      expect(address).toBeInTheDocument();
      expect(address).toHaveClass('font-mono');
    });

    it('does not display contract address section when not provided', () => {
      render(<ScanDashboardHeader scan={mockScanRunning} />);

      // Should not find any element with the specific truncated format
      const address = screen.queryByText(/0x.*\.\.\..*/);
      expect(address).not.toBeInTheDocument();
    });

    it('handles short addresses without truncation', () => {
      render(
        <ScanDashboardHeader
          scan={mockScanRunning}
          contractAddress="0x123"
        />
      );

      const address = screen.getByText('0x123');
      expect(address).toBeInTheDocument();
    });
  });

  describe('Start Time Display', () => {
    it('displays relative start time', () => {
      render(<ScanDashboardHeader scan={mockScanRunning} />);

      // Should show something like "Started 14 minutes ago"
      const timeElement = screen.getByText(/Started.*ago/i);
      expect(timeElement).toBeInTheDocument();
    });

    it('handles invalid date gracefully', () => {
      const invalidDateScan = {
        ...mockScanRunning,
        startedAt: 'invalid-date',
      };
      render(<ScanDashboardHeader scan={invalidDateScan} />);

      const timeElement = screen.getByText('Start time unknown');
      expect(timeElement).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('displays Pause and Abort buttons for RUNNING scans', () => {
      render(<ScanDashboardHeader scan={mockScanRunning} />);

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      const abortButton = screen.getByRole('button', { name: /abort scan/i });

      expect(pauseButton).toBeInTheDocument();
      expect(abortButton).toBeInTheDocument();
    });

    it('does not display action buttons for completed scans', () => {
      render(<ScanDashboardHeader scan={mockScanCompleted} />);

      const pauseButton = screen.queryByRole('button', { name: /pause/i });
      const abortButton = screen.queryByRole('button', { name: /abort scan/i });

      expect(pauseButton).not.toBeInTheDocument();
      expect(abortButton).not.toBeInTheDocument();
    });

    it('disables Pause button with "coming soon" tooltip', () => {
      render(<ScanDashboardHeader scan={mockScanRunning} />);

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      expect(pauseButton).toBeDisabled();
      expect(pauseButton).toHaveAttribute('title', 'Pause feature coming soon');
    });

    it('enables Abort button for running scans', () => {
      render(<ScanDashboardHeader scan={mockScanRunning} />);

      const abortButton = screen.getByRole('button', { name: /abort scan/i });
      expect(abortButton).not.toBeDisabled();
    });
  });

  describe('Abort Confirmation Dialog', () => {
    it('opens confirmation dialog when Abort button is clicked', () => {
      render(<ScanDashboardHeader scan={mockScanRunning} />);

      const abortButtons = screen.getAllByRole('button', { name: /abort scan/i });
      const mainAbortButton = abortButtons[0]; // First one is the main button
      fireEvent.click(mainAbortButton);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const dialogTitle = screen.getByRole('heading', { name: 'Abort Scan' });
      expect(dialogTitle).toBeInTheDocument();

      const dialogDescription = screen.getByText(/are you sure you want to abort this scan/i);
      expect(dialogDescription).toBeInTheDocument();
    });

    it('closes dialog when Cancel button is clicked', () => {
      render(<ScanDashboardHeader scan={mockScanRunning} />);

      // Open dialog
      const abortButtons = screen.getAllByRole('button', { name: /abort scan/i });
      fireEvent.click(abortButtons[0]);

      // Close dialog
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      const dialog = screen.queryByRole('dialog');
      expect(dialog).not.toBeInTheDocument();
    });

    it('closes dialog when clicking backdrop', () => {
      render(<ScanDashboardHeader scan={mockScanRunning} />);

      // Open dialog
      const abortButtons = screen.getAllByRole('button', { name: /abort scan/i });
      fireEvent.click(abortButtons[0]);

      // Click backdrop
      const backdrop = screen.getByRole('dialog').parentElement;
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      const dialog = screen.queryByRole('dialog');
      expect(dialog).not.toBeInTheDocument();
    });

    it('does not close dialog when clicking dialog content', () => {
      render(<ScanDashboardHeader scan={mockScanRunning} />);

      // Open dialog
      const abortButtons = screen.getAllByRole('button', { name: /abort scan/i });
      fireEvent.click(abortButtons[0]);

      // Click dialog content
      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);

      // Dialog should still be open
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('Abort Action', () => {
    it('calls cancelScan API when abort is confirmed', async () => {
      const mockCancelScan = vi.mocked(api.cancelScan);
      mockCancelScan.mockResolvedValue({ id: 'scan-123', state: 'CANCELED' });

      render(<ScanDashboardHeader scan={mockScanRunning} />);

      // Open dialog and confirm
      const abortButtons = screen.getAllByRole('button', { name: /abort scan/i });
      fireEvent.click(abortButtons[0]);

      const confirmButtons = screen.getAllByRole('button', { name: /abort scan/i });
      const confirmButton = confirmButtons[confirmButtons.length - 1]; // Last one is in dialog
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockCancelScan).toHaveBeenCalledWith('scan-123');
      });
    });

    it('shows success toast on successful abort', async () => {
      const mockCancelScan = vi.mocked(api.cancelScan);
      mockCancelScan.mockResolvedValue({ id: 'scan-123', state: 'CANCELED' });

      render(<ScanDashboardHeader scan={mockScanRunning} />);

      // Open dialog and confirm
      const abortButtons = screen.getAllByRole('button', { name: /abort scan/i });
      fireEvent.click(abortButtons[0]);

      const confirmButtons = screen.getAllByRole('button', { name: /abort scan/i });
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Scan aborted successfully');
      });
    });

    it('shows error toast on failed abort', async () => {
      const mockCancelScan = vi.mocked(api.cancelScan);
      mockCancelScan.mockRejectedValue(new Error('Network error'));

      render(<ScanDashboardHeader scan={mockScanRunning} />);

      // Open dialog and confirm
      const abortButtons = screen.getAllByRole('button', { name: /abort scan/i });
      fireEvent.click(abortButtons[0]);

      const confirmButtons = screen.getAllByRole('button', { name: /abort scan/i });
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network error');
      });
    });

    it('calls onScanUpdate callback after successful abort', async () => {
      const mockCancelScan = vi.mocked(api.cancelScan);
      mockCancelScan.mockResolvedValue({ id: 'scan-123', state: 'CANCELED' });

      const onScanUpdate = vi.fn();
      render(<ScanDashboardHeader scan={mockScanRunning} onScanUpdate={onScanUpdate} />);

      // Open dialog and confirm
      const abortButtons = screen.getAllByRole('button', { name: /abort scan/i });
      fireEvent.click(abortButtons[0]);

      const confirmButtons = screen.getAllByRole('button', { name: /abort scan/i });
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);

      await waitFor(() => {
        expect(onScanUpdate).toHaveBeenCalled();
      });
    });

    it('disables buttons during abort operation', async () => {
      const mockCancelScan = vi.mocked(api.cancelScan);
      mockCancelScan.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<ScanDashboardHeader scan={mockScanRunning} />);

      // Open dialog and confirm
      const abortButtons = screen.getAllByRole('button', { name: /abort scan/i });
      fireEvent.click(abortButtons[0]);

      const confirmButtons = screen.getAllByRole('button', { name: /abort scan/i });
      const confirmButton = confirmButtons[confirmButtons.length - 1];
      fireEvent.click(confirmButton);

      // Buttons should be disabled
      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        expect(cancelButton).toBeDisabled();
        expect(confirmButton).toBeDisabled();
      });
    });

    it('shows loading state during abort operation', async () => {
      const mockCancelScan = vi.mocked(api.cancelScan);
      mockCancelScan.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<ScanDashboardHeader scan={mockScanRunning} />);

      // Open dialog and confirm
      const abortButtons = screen.getAllByRole('button', { name: /abort scan/i });
      fireEvent.click(abortButtons[0]);

      const confirmButtons = screen.getAllByRole('button', { name: /abort scan/i });
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);

      // Should show "Aborting..." text
      await waitFor(() => {
        expect(screen.getByText('Aborting...')).toBeInTheDocument();
      });
    });

    it('closes dialog after successful abort', async () => {
      const mockCancelScan = vi.mocked(api.cancelScan);
      mockCancelScan.mockResolvedValue({ id: 'scan-123', state: 'CANCELED' });

      render(<ScanDashboardHeader scan={mockScanRunning} />);

      // Open dialog and confirm
      const abortButtons = screen.getAllByRole('button', { name: /abort scan/i });
      fireEvent.click(abortButtons[0]);

      const confirmButtons = screen.getAllByRole('button', { name: /abort scan/i });
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);

      await waitFor(() => {
        const dialog = screen.queryByRole('dialog');
        expect(dialog).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('hides button text on small screens using sm:inline class', () => {
      render(<ScanDashboardHeader scan={mockScanRunning} />);

      const pauseText = screen.getByText('Pause');
      const abortText = screen.getByText('Abort Scan');

      expect(pauseText).toHaveClass('sm:inline');
      expect(abortText).toHaveClass('sm:inline');
    });
  });

  describe('Accessibility', () => {
    it('uses semantic header element', () => {
      const { container } = render(<ScanDashboardHeader scan={mockScanRunning} />);

      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    it('provides proper dialog ARIA attributes', () => {
      render(<ScanDashboardHeader scan={mockScanRunning} />);

      // Open dialog
      const abortButtons = screen.getAllByRole('button', { name: /abort scan/i });
      fireEvent.click(abortButtons[0]);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'abort-dialog-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'abort-dialog-description');
    });

    it('uses proper heading hierarchy', () => {
      render(<ScanDashboardHeader scan={mockScanRunning} />);

      // Open dialog
      const abortButtons = screen.getAllByRole('button', { name: /abort scan/i });
      fireEvent.click(abortButtons[0]);

      const mainHeading = screen.getByRole('heading', { level: 1 });
      const dialogHeading = screen.getByRole('heading', { level: 2 });

      expect(mainHeading).toBeInTheDocument();
      expect(dialogHeading).toBeInTheDocument();
    });
  });
});
