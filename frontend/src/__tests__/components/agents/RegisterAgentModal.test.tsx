import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterAgentModal } from '../../../components/agents/RegisterAgentModal';

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
  useWriteContract: () => ({
    writeContract: vi.fn(),
    data: undefined,
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: false,
    isSuccess: false,
  }),
  useChainId: () => 84532,
}));

// Mock api functions
vi.mock('../../../lib/api', () => ({
  registerAgent: vi.fn().mockResolvedValue({}),
  syncAgentRegistration: vi.fn().mockResolvedValue({}),
}));

// Mock contracts
vi.mock('../../../lib/contracts', () => ({
  getContractByName: () => ({ address: '0x1234567890123456789012345678901234567890' }),
}));

describe('RegisterAgentModal', () => {
  const mockOnClose = vi.fn();
  const mockOnRegistrationComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen=false', () => {
    const { container } = render(
      <RegisterAgentModal isOpen={false} onClose={mockOnClose} onRegistrationComplete={mockOnRegistrationComplete} />
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders modal when isOpen=true', () => {
    render(
      <RegisterAgentModal isOpen={true} onClose={mockOnClose} onRegistrationComplete={mockOnRegistrationComplete} />
    );

    const registerTexts = screen.getAllByText(/Register/i);
    expect(registerTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Add a new ERC-8004 agent identity')).toBeInTheDocument();
  });

  it('renders agent type selector', () => {
    render(
      <RegisterAgentModal isOpen={true} onClose={mockOnClose} onRegistrationComplete={mockOnRegistrationComplete} />
    );

    expect(screen.getByText('Researcher')).toBeInTheDocument();
    expect(screen.getByText('Validator')).toBeInTheDocument();
    expect(screen.getByText('Finds vulnerabilities')).toBeInTheDocument();
    expect(screen.getByText('Reviews findings')).toBeInTheDocument();
  });

  it('calls onClose on Cancel click', () => {
    render(
      <RegisterAgentModal isOpen={true} onClose={mockOnClose} onRegistrationComplete={mockOnRegistrationComplete} />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows connect wallet message when on-chain toggle is ON and wallet not connected', () => {
    render(
      <RegisterAgentModal isOpen={true} onClose={mockOnClose} onRegistrationComplete={mockOnRegistrationComplete} />
    );

    expect(screen.getByText('Connect your wallet to register on-chain.')).toBeInTheDocument();
  });

  it('shows manual wallet input when on-chain toggle is OFF', () => {
    render(
      <RegisterAgentModal isOpen={true} onClose={mockOnClose} onRegistrationComplete={mockOnRegistrationComplete} />
    );

    // Toggle off on-chain registration
    fireEvent.click(screen.getByText('Register on blockchain (ERC-8004)'));

    expect(screen.getByPlaceholderText('0x...')).toBeInTheDocument();
  });
});
