import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterAgentModal } from '../../../components/agents/RegisterAgentModal';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
  },
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

    expect(screen.getByText('Register Agent')).toBeInTheDocument();
    expect(screen.getByText('Hire through Coinbase Bazaar discovery')).toBeInTheDocument();
    expect(screen.getByText('Resource URL (Coinbase Bazaar Discovery)')).toBeInTheDocument();
    expect(screen.getByText('Hire Researcher Agent from Coinbase Bazaar')).toBeInTheDocument();
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

  it('shows URL validation error when input is empty', () => {
    render(
      <RegisterAgentModal isOpen={true} onClose={mockOnClose} onRegistrationComplete={mockOnRegistrationComplete} />
    );

    fireEvent.click(screen.getByText('Hire Researcher Agent from Coinbase Bazaar'));

    expect(screen.getByText('Resource URL is required')).toBeInTheDocument();
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('shows URL validation error when URL format is invalid', () => {
    render(
      <RegisterAgentModal isOpen={true} onClose={mockOnClose} onRegistrationComplete={mockOnRegistrationComplete} />
    );

    fireEvent.change(
      screen.getByPlaceholderText('https://www.coinbase.com/es-la/developer-platform/discover/launches/x402-bazaar'),
      { target: { value: 'not-a-url' } }
    );
    fireEvent.click(screen.getByText('Hire Researcher Agent from Coinbase Bazaar'));

    expect(screen.getByText('Enter a valid http/https URL.')).toBeInTheDocument();
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('shows Coming soon toast when URL is valid', () => {
    render(
      <RegisterAgentModal isOpen={true} onClose={mockOnClose} onRegistrationComplete={mockOnRegistrationComplete} />
    );

    fireEvent.change(
      screen.getByPlaceholderText('https://www.coinbase.com/es-la/developer-platform/discover/launches/x402-bazaar'),
      { target: { value: 'https://www.coinbase.com/es-la/developer-platform/discover/launches/x402-bazaar' } }
    );
    fireEvent.click(screen.getByText('Hire Researcher Agent from Coinbase Bazaar'));

    expect(toast.info).toHaveBeenCalledWith('Coming soon');
  });
});
