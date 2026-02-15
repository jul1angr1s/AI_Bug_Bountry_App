import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterAgentModal } from '../../../components/agents/RegisterAgentModal';

describe('RegisterAgentModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  it('does not render when isOpen=false', () => {
    const { container } = render(
      <RegisterAgentModal isOpen={false} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders modal when isOpen=true', () => {
    render(
      <RegisterAgentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );

    const registerTexts = screen.getAllByText('Register Agent');
    expect(registerTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Add a new ERC-8004 agent identity')).toBeInTheDocument();
  });

  it('renders agent type selector', () => {
    render(
      <RegisterAgentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );

    expect(screen.getByText('Researcher')).toBeInTheDocument();
    expect(screen.getByText('Validator')).toBeInTheDocument();
    expect(screen.getByText('Finds vulnerabilities')).toBeInTheDocument();
    expect(screen.getByText('Reviews findings')).toBeInTheDocument();
  });

  it('calls onClose on Cancel click', () => {
    render(
      <RegisterAgentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows loading state during submission', async () => {
    // Make onSubmit hang so we can observe the loading state
    let resolveSubmit: () => void;
    mockOnSubmit.mockImplementation(
      () => new Promise<void>((resolve) => { resolveSubmit = resolve; })
    );

    render(
      <RegisterAgentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );

    // Fill in a valid wallet address
    const input = screen.getByPlaceholderText('0x...');
    fireEvent.change(input, { target: { value: '0x59932bDf3056D88DC07cb320263419B8ec1e942d' } });

    // Submit the form by clicking the submit button
    fireEvent.click(screen.getByRole('button', { name: /Register Agent/i }));

    await waitFor(() => {
      expect(screen.getByText('Registering...')).toBeInTheDocument();
    });

    // Resolve the submission to clean up
    resolveSubmit!();
  });

  it('submits with registerOnChain enabled by default', async () => {
    render(
      <RegisterAgentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );

    const input = screen.getByPlaceholderText('0x...');
    fireEvent.change(input, { target: { value: '0x59932bDf3056D88DC07cb320263419B8ec1e942d' } });

    fireEvent.click(screen.getByRole('button', { name: /Register Agent/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        walletAddress: '0x59932bDf3056D88DC07cb320263419B8ec1e942d',
        agentType: 'RESEARCHER',
        registerOnChain: true,
      });
    });
  });
});
