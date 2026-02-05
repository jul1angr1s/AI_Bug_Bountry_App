import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProposePaymentModal } from '../../../components/payments/ProposePaymentModal';
import type { PaymentProposal } from '../../../components/payments/ProposePaymentModal';

describe('ProposePaymentModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSubmit.mockClear();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ProposePaymentModal isOpen={false} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen is true', () => {
    render(<ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    expect(screen.getByText('Propose Manual Payment')).toBeInTheDocument();
  });

  it('renders all form fields', () => {
    render(<ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    
    expect(screen.getByText('Protocol ID')).toBeInTheDocument();
    expect(screen.getByText('Recipient Address')).toBeInTheDocument();
    expect(screen.getByText('Severity Level')).toBeInTheDocument();
    expect(screen.getByText('Justification')).toBeInTheDocument();
  });

  it('shows severity dropdown with correct options', () => {
    render(<ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    
    const options = screen.getAllByRole('option');
    expect(options.length).toBe(3);
    expect(screen.getByText('High (5 USDC)')).toBeInTheDocument();
    expect(screen.getByText('Medium (3 USDC)')).toBeInTheDocument();
    expect(screen.getByText('Low (1 USDC)')).toBeInTheDocument();
  });

  it('closes modal when close button is clicked', () => {
    const { container } = render(<ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    
    // Close button is at top right with X icon
    const closeButtons = container.querySelectorAll('button');
    const closeButton = closeButtons[0]; // First button is the X close button
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when Cancel button is clicked', () => {
    render(<ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when backdrop is clicked', () => {
    const { container } = render(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );
    
    const backdrop = container.querySelector('.backdrop-blur-sm');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('validates required fields on submit', async () => {
    render(<ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    
    const submitButton = screen.getByText('Submit Proposal');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Protocol ID is required')).toBeInTheDocument();
      expect(screen.getByText('Recipient address is required')).toBeInTheDocument();
      expect(screen.getByText('Justification is required')).toBeInTheDocument();
    });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates Ethereum address format', async () => {
    render(<ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    
    const addressInput = screen.getByPlaceholderText('0x...');
    fireEvent.change(addressInput, { target: { value: 'invalid-address' } });
    
    const submitButton = screen.getByText('Submit Proposal');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid Ethereum address format')).toBeInTheDocument();
    });
  });

  it('validates justification length (minimum)', async () => {
    render(<ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    
    const justificationInput = screen.getByPlaceholderText(/Explain why this manual override/i);
    fireEvent.change(justificationInput, { target: { value: 'Too short' } });
    
    const submitButton = screen.getByText('Submit Proposal');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Justification must be at least 20 characters')).toBeInTheDocument();
    });
  });

  it('validates justification length (maximum)', async () => {
    render(<ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    
    const longText = 'a'.repeat(501);
    const justificationInput = screen.getByPlaceholderText(/Explain why this manual override/i);
    fireEvent.change(justificationInput, { target: { value: longText } });
    
    const submitButton = screen.getByText('Submit Proposal');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Justification must be less than 500 characters')).toBeInTheDocument();
    });
  });

  it('shows character count for justification', () => {
    render(<ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    
    const justificationInput = screen.getByPlaceholderText(/Explain why this manual override/i);
    fireEvent.change(justificationInput, { target: { value: 'Test justification text' } });
    
    expect(screen.getByText(/23\/500/)).toBeInTheDocument();
  });

  it('submits valid form data', async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    
    render(<ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    
    const protocolInput = screen.getByPlaceholderText(/e.g., PROTO-X99-BETA/i);
    const addressInput = screen.getByPlaceholderText('0x...');
    const severitySelect = screen.getByRole('combobox');
    const justificationInput = screen.getByPlaceholderText(/Explain why this manual override/i);
    
    fireEvent.change(protocolInput, { target: { value: '123e4567-e89b-12d3-a456-426614174000' } });
    fireEvent.change(addressInput, { target: { value: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' } });
    fireEvent.change(severitySelect, { target: { value: 'HIGH' } });
    fireEvent.change(justificationInput, { 
      target: { value: 'This is a valid justification that is long enough to pass validation' } 
    });
    
    const submitButton = screen.getByText('Submit Proposal');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        protocolId: '123e4567-e89b-12d3-a456-426614174000',
        recipientAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        severity: 'HIGH',
        justification: 'This is a valid justification that is long enough to pass validation',
      });
    });
  });

  it('shows loading state during submission', async () => {
    mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    
    const protocolInput = screen.getByPlaceholderText(/e.g., PROTO-X99-BETA/i);
    const addressInput = screen.getByPlaceholderText('0x...');
    const justificationInput = screen.getByPlaceholderText(/Explain why this manual override/i);
    
    fireEvent.change(protocolInput, { target: { value: '123e4567-e89b-12d3-a456-426614174000' } });
    fireEvent.change(addressInput, { target: { value: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' } });
    fireEvent.change(justificationInput, { 
      target: { value: 'Valid justification for testing' } 
    });
    
    const submitButton = screen.getByText('Submit Proposal');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Submitting...')).toBeInTheDocument();
    });
  });

  it('resets form when modal closes', async () => {
    const { rerender } = render(
      <ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );
    
    const protocolInput = screen.getByPlaceholderText(/e.g., PROTO-X99-BETA/i);
    fireEvent.change(protocolInput, { target: { value: 'test-value' } });
    
    rerender(<ProposePaymentModal isOpen={false} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    rerender(<ProposePaymentModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
    
    const resetInput = screen.getByPlaceholderText(/e.g., PROTO-X99-BETA/i) as HTMLInputElement;
    expect(resetInput.value).toBe('');
  });
});
