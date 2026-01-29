import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CriticalAlertBanner from '../../../components/Dashboard/CriticalAlertBanner';
import type { Alert } from '../../../types/dashboard';

describe('CriticalAlertBanner', () => {
  const mockAlert: Alert = {
    id: '1',
    severity: 'CRITICAL',
    message: 'Critical vulnerability detected in DeFi Protocol withdraw function',
    timestamp: '2024-01-28T10:00:00Z',
  };

  it('renders alert message', () => {
    render(<CriticalAlertBanner alert={mockAlert} onDismiss={() => {}} />);
    expect(screen.getByText(/Critical vulnerability detected/i)).toBeInTheDocument();
  });

  it('displays severity badge', () => {
    render(<CriticalAlertBanner alert={mockAlert} onDismiss={() => {}} />);
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('shows dismiss button', () => {
    render(<CriticalAlertBanner alert={mockAlert} onDismiss={() => {}} />);
    const dismissButton = screen.getByRole('button', { name: /dismiss|close/i });
    expect(dismissButton).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(<CriticalAlertBanner alert={mockAlert} onDismiss={onDismiss} />);

    const dismissButton = screen.getByRole('button', { name: /dismiss|close/i });
    await user.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledWith(mockAlert.id);
  });

  it('applies critical styling for CRITICAL severity', () => {
    const { container } = render(
      <CriticalAlertBanner alert={mockAlert} onDismiss={() => {}} />
    );
    const banner = container.firstChild;
    expect(banner).toHaveClass('bg-status-critical');
  });

  it('applies info styling for INFO severity', () => {
    const infoAlert = { ...mockAlert, severity: 'INFO' as const };
    const { container } = render(
      <CriticalAlertBanner alert={infoAlert} onDismiss={() => {}} />
    );
    const banner = container.firstChild;
    expect(banner).toHaveClass('bg-status-info');
  });

  it('does not render when alert is null', () => {
    const { container } = render(
      <CriticalAlertBanner alert={null} onDismiss={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });
});
