import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProposePaymentModal } from '../../../components/payments/ProposePaymentModal';
import type { PaymentProposal } from '../../../components/payments/ProposePaymentModal';
import { fetchProtocols, fetchAgentIdentities } from '../../../lib/api';

vi.mock('../../../lib/api', () => ({
  fetchProtocols: vi.fn(),
  fetchAgentIdentities: vi.fn(),
}));

const mockProtocols = {
  protocols: [
    { id: 'proto-1', contractName: 'Uniswap V3', status: 'ACTIVE' },
    { id: 'proto-2', contractName: 'Aave V3', status: 'ACTIVE' },
  ],
  pagination: { total: 2, page: 1, limit: 10 },
};

const mockAgents = [
  {
    id: 'agent-1',
    walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    agentType: 'RESEARCHER' as const,
    isActive: true,
    registeredAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'agent-2',
    walletAddress: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    agentType: 'VALIDATOR' as const,
    isActive: true,
    registeredAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'agent-3',
    walletAddress: '0xCA35b7d915458EF540aDe6068dFe2F44E8fa733c',
    agentType: 'RESEARCHER' as const,
    isActive: false,
    registeredAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('ProposePaymentModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSubmit.mockClear();
    (fetchProtocols as ReturnType<typeof vi.fn>).mockResolvedValue(mockProtocols);
    (fetchAgentIdentities as ReturnType<typeof vi.fn>).mockResolvedValue(mockAgents);
  });

  it('does not render when isOpen is false', () => {
    const { container } = renderWithProviders(
      <ProposePaymentModal isOpen={false} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen is true', () => {
    renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );
    expect(screen.getByText('Propose Manual Payment')).toBeInTheDocument();
  });

  it('renders all form fields', () => {
    renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );
    expect(screen.getByText('Protocol ID')).toBeInTheDocument();
    expect(screen.getByText('Recipient Address')).toBeInTheDocument();
    expect(screen.getByText('Severity Level')).toBeInTheDocument();
    expect(screen.getByText('Justification')).toBeInTheDocument();
  });

  it('shows severity dropdown with correct options', async () => {
    renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );

    await waitFor(() => {
      expect(fetchAgentIdentities).toHaveBeenCalled();
    });

    const selects = screen.getAllByRole('combobox');
    // Protocol selector, Agent selector, Severity selector
    const severitySelect = selects[2];
    const severityOptions = severitySelect.querySelectorAll('option');
    expect(severityOptions).toHaveLength(4);
    expect(screen.getByText('Critical (10 USDC)')).toBeInTheDocument();
    expect(screen.getByText('High (5 USDC)')).toBeInTheDocument();
    expect(screen.getByText('Medium (3 USDC)')).toBeInTheDocument();
    expect(screen.getByText('Low (1 USDC)')).toBeInTheDocument();
  });

  it('closes modal when close button is clicked', () => {
    const { container } = renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );
    const closeButtons = container.querySelectorAll('button');
    const closeButton = closeButtons[0];
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when Cancel button is clicked', () => {
    renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when backdrop is clicked', () => {
    const { container } = renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );
    const backdrop = container.querySelector('.backdrop-blur-sm');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('validates required fields on submit', async () => {
    renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );

    fireEvent.click(screen.getByText('Submit Proposal'));

    await waitFor(() => {
      expect(screen.getByText('Protocol ID is required')).toBeInTheDocument();
      expect(screen.getByText('Recipient address is required')).toBeInTheDocument();
      expect(screen.getByText('Justification is required')).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates justification length (minimum)', async () => {
    renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );
    const justificationInput = screen.getByPlaceholderText(/Explain why this manual override/i);
    fireEvent.change(justificationInput, { target: { value: 'Too short' } });
    fireEvent.click(screen.getByText('Submit Proposal'));

    await waitFor(() => {
      expect(screen.getByText('Justification must be at least 20 characters')).toBeInTheDocument();
    });
  });

  it('validates justification length (maximum)', async () => {
    renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );
    const justificationInput = screen.getByPlaceholderText(/Explain why this manual override/i);
    fireEvent.change(justificationInput, { target: { value: 'a'.repeat(501) } });
    fireEvent.click(screen.getByText('Submit Proposal'));

    await waitFor(() => {
      expect(screen.getByText('Justification must be less than 500 characters')).toBeInTheDocument();
    });
  });

  it('shows character count for justification', () => {
    renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );
    const justificationInput = screen.getByPlaceholderText(/Explain why this manual override/i);
    fireEvent.change(justificationInput, { target: { value: 'Test justification text' } });
    expect(screen.getByText(/23\/500/)).toBeInTheDocument();
  });

  // ===== Agent selector tests =====

  it('renders agent dropdown instead of text input', async () => {
    renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );

    await waitFor(() => {
      expect(fetchAgentIdentities).toHaveBeenCalled();
    });

    // Should NOT have a text input with 0x... placeholder
    expect(screen.queryByPlaceholderText('0x...')).not.toBeInTheDocument();

    // Should have a select under "Recipient Address"
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(3); // protocol, agent, severity
  });

  it('shows active agents with truncated address and type', async () => {
    renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );

    await waitFor(() => {
      expect(screen.getByText('0x71C7...976F (Researcher)')).toBeInTheDocument();
      expect(screen.getByText('0xAb58...eC9B (Validator)')).toBeInTheDocument();
    });
  });

  it('filters out inactive agents', async () => {
    renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );

    await waitFor(() => {
      expect(screen.getByText('0x71C7...976F (Researcher)')).toBeInTheDocument();
    });

    // Inactive agent's address should not appear
    expect(screen.queryByText(/0xCA35/)).not.toBeInTheDocument();
  });

  it('shows loading state while agents are being fetched', () => {
    // Make fetchAgentIdentities hang (never resolve)
    (fetchAgentIdentities as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );

    expect(screen.getByText('Loading agents...')).toBeInTheDocument();
  });

  it('shows empty state when no active agents exist', async () => {
    (fetchAgentIdentities as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...mockAgents[2] }, // only inactive agent
    ]);

    renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );

    await waitFor(() => {
      expect(screen.getByText('No active agents found')).toBeInTheDocument();
    });
  });

  it('submits full wallet address from agent selection', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );

    await waitFor(() => {
      expect(screen.getByText('0x71C7...976F (Researcher)')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    const protocolSelect = selects[0];
    const agentSelect = selects[1];
    const severitySelect = selects[2];

    fireEvent.change(protocolSelect, { target: { value: 'proto-1' } });
    fireEvent.change(agentSelect, { target: { value: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' } });
    fireEvent.change(severitySelect, { target: { value: 'HIGH' } });

    const justificationInput = screen.getByPlaceholderText(/Explain why this manual override/i);
    fireEvent.change(justificationInput, {
      target: { value: 'This is a valid justification that is long enough to pass validation' },
    });

    fireEvent.click(screen.getByText('Submit Proposal'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        protocolId: 'proto-1',
        recipientAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        severity: 'HIGH',
        justification: 'This is a valid justification that is long enough to pass validation',
      });
    });
  });

  it('validates agent must be selected', async () => {
    renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );

    await waitFor(() => {
      expect(screen.getByText('0x71C7...976F (Researcher)')).toBeInTheDocument();
    });

    // Fill everything except agent
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'proto-1' } });

    const justificationInput = screen.getByPlaceholderText(/Explain why this manual override/i);
    fireEvent.change(justificationInput, {
      target: { value: 'This is a valid justification that is long enough to pass validation' },
    });

    fireEvent.click(screen.getByText('Submit Proposal'));

    await waitFor(() => {
      expect(screen.getByText('Recipient address is required')).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    mockOnSubmit.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );

    await waitFor(() => {
      expect(screen.getByText('0x71C7...976F (Researcher)')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'proto-1' } });
    fireEvent.change(selects[1], { target: { value: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' } });

    const justificationInput = screen.getByPlaceholderText(/Explain why this manual override/i);
    fireEvent.change(justificationInput, {
      target: { value: 'Valid justification for testing purposes here' },
    });

    fireEvent.click(screen.getByText('Submit Proposal'));

    await waitFor(() => {
      expect(screen.getByText('Submitting...')).toBeInTheDocument();
    });
  });

  it('resets form when modal closes', async () => {
    const { rerender } = renderWithProviders(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );

    await waitFor(() => {
      expect(screen.getByText('0x71C7...976F (Researcher)')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    const agentSelect = selects[1] as HTMLSelectElement;
    fireEvent.change(agentSelect, { target: { value: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' } });
    expect(agentSelect.value).toBe('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');

    // We need a fresh QueryClient for each render since the component is unmounted
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <ProposePaymentModal isOpen={false} onClose={mockOnClose} onSubmit={mockOnSubmit} />
      </QueryClientProvider>
    );
    rerender(
      <QueryClientProvider client={queryClient}>
        <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      const resetSelects = screen.getAllByRole('combobox');
      const resetAgentSelect = resetSelects[1] as HTMLSelectElement;
      expect(resetAgentSelect.value).toBe('');
    });
  });
});
