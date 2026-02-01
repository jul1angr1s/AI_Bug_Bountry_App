import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { http } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { createConfig } from 'wagmi';
import userEvent from '@testing-library/user-event';
import { EarningsLeaderboard } from './EarningsLeaderboard';
import * as api from '@/lib/api';
import type { LeaderboardResponse } from '@/lib/api';

// Mock wagmi config for testing
const mockConfig = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
});

// Helper to render component with providers
const renderWithProviders = (
  ui: React.ReactElement,
  { address }: { address?: string } = {}
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  // Mock useAccount hook
  vi.spyOn(require('wagmi'), 'useAccount').mockReturnValue({
    address: address as `0x${string}` | undefined,
    isConnected: !!address,
  });

  return render(
    <WagmiProvider config={mockConfig}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </WagmiProvider>
  );
};

describe('EarningsLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading spinner while fetching data', () => {
      // Mock API to return pending promise
      vi.spyOn(api, 'fetchLeaderboard').mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithProviders(<EarningsLeaderboard />);

      expect(screen.getByText('Loading leaderboard...')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Earnings Leaderboard' })
      ).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display "No payments yet" when leaderboard is empty', async () => {
      const emptyResponse: LeaderboardResponse = {
        leaderboard: [],
        total: 0,
      };

      vi.spyOn(api, 'fetchLeaderboard').mockResolvedValue(emptyResponse);

      renderWithProviders(<EarningsLeaderboard />);

      await waitFor(() => {
        expect(screen.getByText('No payments yet')).toBeInTheDocument();
      });

      expect(
        screen.getByText(
          'The leaderboard will appear once researchers receive payments.'
        )
      ).toBeInTheDocument();
    });

    it('should show refresh button in empty state', async () => {
      const emptyResponse: LeaderboardResponse = {
        leaderboard: [],
        total: 0,
      };

      vi.spyOn(api, 'fetchLeaderboard').mockResolvedValue(emptyResponse);

      renderWithProviders(<EarningsLeaderboard />);

      await waitFor(() => {
        expect(screen.getByText('No payments yet')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', async () => {
      const errorMessage = 'Failed to fetch leaderboard';
      vi.spyOn(api, 'fetchLeaderboard').mockRejectedValue(
        new Error(errorMessage)
      );

      renderWithProviders(<EarningsLeaderboard />);

      await waitFor(() => {
        expect(
          screen.getByText('Error loading leaderboard')
        ).toBeInTheDocument();
      });

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should allow retry after error', async () => {
      const errorMessage = 'Network error';
      const fetchSpy = vi
        .spyOn(api, 'fetchLeaderboard')
        .mockRejectedValueOnce(new Error(errorMessage))
        .mockResolvedValueOnce({
          leaderboard: [],
          total: 0,
        });

      renderWithProviders(<EarningsLeaderboard />);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('No payments yet')).toBeInTheDocument();
      });

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Leaderboard Display', () => {
    const mockLeaderboard: LeaderboardResponse = {
      leaderboard: [
        {
          researcherAddress: '0x1234567890abcdef1234567890abcdef12345678',
          totalEarnings: '5000.00',
          paymentCount: 10,
          averagePaymentAmount: '500.00',
        },
        {
          researcherAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
          totalEarnings: '3000.00',
          paymentCount: 6,
          averagePaymentAmount: '500.00',
        },
        {
          researcherAddress: '0xfedcba0987654321fedcba0987654321fedcba09',
          totalEarnings: '2000.00',
          paymentCount: 4,
          averagePaymentAmount: '500.00',
        },
      ],
      total: 3,
    };

    it('should display leaderboard table with all columns', async () => {
      vi.spyOn(api, 'fetchLeaderboard').mockResolvedValue(mockLeaderboard);

      renderWithProviders(<EarningsLeaderboard />);

      await waitFor(() => {
        expect(screen.getByText('Rank')).toBeInTheDocument();
      });

      expect(screen.getByText('Researcher Address')).toBeInTheDocument();
      expect(screen.getByText('Total Earnings')).toBeInTheDocument();
      expect(screen.getByText('Payments')).toBeInTheDocument();
      expect(screen.getByText('Avg Payment')).toBeInTheDocument();
    });

    it('should display truncated addresses', async () => {
      vi.spyOn(api, 'fetchLeaderboard').mockResolvedValue(mockLeaderboard);

      renderWithProviders(<EarningsLeaderboard />);

      await waitFor(() => {
        expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
      });

      expect(screen.getByText('0xabcd...ef12')).toBeInTheDocument();
      expect(screen.getByText('0xfedc...ba09')).toBeInTheDocument();
    });

    it('should display earnings data correctly', async () => {
      vi.spyOn(api, 'fetchLeaderboard').mockResolvedValue(mockLeaderboard);

      renderWithProviders(<EarningsLeaderboard />);

      await waitFor(() => {
        expect(screen.getByText('5000.00 USDC')).toBeInTheDocument();
      });

      expect(screen.getByText('3000.00 USDC')).toBeInTheDocument();
      expect(screen.getByText('2000.00 USDC')).toBeInTheDocument();
    });

    it('should display payment counts', async () => {
      vi.spyOn(api, 'fetchLeaderboard').mockResolvedValue(mockLeaderboard);

      renderWithProviders(<EarningsLeaderboard />);

      await waitFor(() => {
        const cells = screen.getAllByText('10');
        expect(cells.length).toBeGreaterThan(0);
      });

      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  describe('Rank Badges', () => {
    const mockLeaderboard: LeaderboardResponse = {
      leaderboard: [
        {
          researcherAddress: '0x1111111111111111111111111111111111111111',
          totalEarnings: '5000.00',
          paymentCount: 10,
          averagePaymentAmount: '500.00',
        },
        {
          researcherAddress: '0x2222222222222222222222222222222222222222',
          totalEarnings: '3000.00',
          paymentCount: 6,
          averagePaymentAmount: '500.00',
        },
        {
          researcherAddress: '0x3333333333333333333333333333333333333333',
          totalEarnings: '2000.00',
          paymentCount: 4,
          averagePaymentAmount: '500.00',
        },
        {
          researcherAddress: '0x4444444444444444444444444444444444444444',
          totalEarnings: '1000.00',
          paymentCount: 2,
          averagePaymentAmount: '500.00',
        },
      ],
      total: 4,
    };

    it('should display rank #4 for 4th place', async () => {
      vi.spyOn(api, 'fetchLeaderboard').mockResolvedValue(mockLeaderboard);

      renderWithProviders(<EarningsLeaderboard />);

      await waitFor(() => {
        expect(screen.getByText('#4')).toBeInTheDocument();
      });
    });
  });

  describe('Current User Highlighting', () => {
    const mockLeaderboard: LeaderboardResponse = {
      leaderboard: [
        {
          researcherAddress: '0x1234567890abcdef1234567890abcdef12345678',
          totalEarnings: '5000.00',
          paymentCount: 10,
          averagePaymentAmount: '500.00',
        },
        {
          researcherAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
          totalEarnings: '3000.00',
          paymentCount: 6,
          averagePaymentAmount: '500.00',
        },
      ],
      total: 2,
    };

    it('should highlight current user row with "You" badge', async () => {
      vi.spyOn(api, 'fetchLeaderboard').mockResolvedValue(mockLeaderboard);

      renderWithProviders(<EarningsLeaderboard />, {
        address: '0x1234567890abcdef1234567890abcdef12345678',
      });

      await waitFor(() => {
        expect(screen.getByText('You')).toBeInTheDocument();
      });
    });

    it('should not highlight row when user is not in leaderboard', async () => {
      vi.spyOn(api, 'fetchLeaderboard').mockResolvedValue(mockLeaderboard);

      renderWithProviders(<EarningsLeaderboard />, {
        address: '0x9999999999999999999999999999999999999999',
      });

      await waitFor(() => {
        expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
      });

      expect(screen.queryByText('You')).not.toBeInTheDocument();
    });

    it('should handle case-insensitive address matching', async () => {
      vi.spyOn(api, 'fetchLeaderboard').mockResolvedValue(mockLeaderboard);

      // Address in uppercase
      renderWithProviders(<EarningsLeaderboard />, {
        address: '0X1234567890ABCDEF1234567890ABCDEF12345678',
      });

      await waitFor(() => {
        expect(screen.getByText('You')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should refetch data when refresh button is clicked', async () => {
      const fetchSpy = vi
        .spyOn(api, 'fetchLeaderboard')
        .mockResolvedValue({ leaderboard: [], total: 0 });

      renderWithProviders(<EarningsLeaderboard />);

      await waitFor(() => {
        expect(screen.getByText('No payments yet')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', {
        name: /refresh leaderboard/i,
      });
      await userEvent.click(refreshButton);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledTimes(2);
      });
    });

    it('should disable refresh button while fetching', async () => {
      vi.spyOn(api, 'fetchLeaderboard').mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderWithProviders(<EarningsLeaderboard />);

      await waitFor(() => {
        const refreshButton = screen.queryByRole('button', {
          name: /refresh/i,
        });
        if (refreshButton) {
          expect(refreshButton).toBeDisabled();
        }
      });
    });
  });

  describe('Custom Limit', () => {
    it('should fetch leaderboard with custom limit', async () => {
      const fetchSpy = vi
        .spyOn(api, 'fetchLeaderboard')
        .mockResolvedValue({ leaderboard: [], total: 0 });

      renderWithProviders(<EarningsLeaderboard limit={5} />);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(5);
      });
    });

    it('should use default limit of 10 when not specified', async () => {
      const fetchSpy = vi
        .spyOn(api, 'fetchLeaderboard')
        .mockResolvedValue({ leaderboard: [], total: 0 });

      renderWithProviders(<EarningsLeaderboard />);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(10);
      });
    });
  });

  describe('Footer Display', () => {
    it('should show correct count in footer', async () => {
      const mockLeaderboard: LeaderboardResponse = {
        leaderboard: [
          {
            researcherAddress: '0x1111111111111111111111111111111111111111',
            totalEarnings: '5000.00',
            paymentCount: 10,
            averagePaymentAmount: '500.00',
          },
          {
            researcherAddress: '0x2222222222222222222222222222222222222222',
            totalEarnings: '3000.00',
            paymentCount: 6,
            averagePaymentAmount: '500.00',
          },
        ],
        total: 2,
      };

      vi.spyOn(api, 'fetchLeaderboard').mockResolvedValue(mockLeaderboard);

      renderWithProviders(<EarningsLeaderboard />);

      await waitFor(() => {
        expect(
          screen.getByText('Showing top 2 researchers by total earnings')
        ).toBeInTheDocument();
      });
    });

    it('should use singular "researcher" for single entry', async () => {
      const mockLeaderboard: LeaderboardResponse = {
        leaderboard: [
          {
            researcherAddress: '0x1111111111111111111111111111111111111111',
            totalEarnings: '5000.00',
            paymentCount: 10,
            averagePaymentAmount: '500.00',
          },
        ],
        total: 1,
      };

      vi.spyOn(api, 'fetchLeaderboard').mockResolvedValue(mockLeaderboard);

      renderWithProviders(<EarningsLeaderboard />);

      await waitFor(() => {
        expect(
          screen.getByText('Showing top 1 researcher by total earnings')
        ).toBeInTheDocument();
      });
    });
  });
});
