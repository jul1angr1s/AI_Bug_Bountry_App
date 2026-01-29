import { render, screen } from '@testing-library/react';
import StatusBadge from '../../../components/shared/StatusBadge';

describe('StatusBadge', () => {
  it('renders status text', () => {
    render(<StatusBadge status="ONLINE" />);
    expect(screen.getByText('ONLINE')).toBeInTheDocument();
  });

  it('applies green color for ONLINE status', () => {
    const { container } = render(<StatusBadge status="ONLINE" />);
    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-status-online');
  });

  it('applies red color for OFFLINE status', () => {
    const { container } = render(<StatusBadge status="OFFLINE" />);
    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-red-500');
  });

  it('applies blue color for SCANNING status', () => {
    const { container } = render(<StatusBadge status="SCANNING" />);
    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-blue-500');
  });

  it('applies red color for ERROR status', () => {
    const { container } = render(<StatusBadge status="ERROR" />);
    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-status-critical');
  });
});
