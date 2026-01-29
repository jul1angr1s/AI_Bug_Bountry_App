import { render, screen } from '@testing-library/react';
import StatCard from '../../../components/shared/StatCard';

describe('StatCard', () => {
  it('renders title and value', () => {
    render(<StatCard title="Bounty Pool" value="$50,000" />);
    expect(screen.getByText('Bounty Pool')).toBeInTheDocument();
    expect(screen.getByText('$50,000')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <StatCard
        title="Total Paid"
        value="$25,000"
        subtitle="Last payment: 2 hours ago"
      />
    );
    expect(screen.getByText('Last payment: 2 hours ago')).toBeInTheDocument();
  });

  it('renders progress bar when progress prop is provided', () => {
    const { container } = render(
      <StatCard
        title="Bounty Pool"
        value="$50,000"
        progress={75}
      />
    );
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('sets correct progress bar width', () => {
    const { container } = render(
      <StatCard
        title="Bounty Pool"
        value="$50,000"
        progress={60}
      />
    );
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar?.getAttribute('style')).toContain('60');
  });

  it('does not render progress bar when progress is not provided', () => {
    const { container } = render(
      <StatCard title="Total Paid" value="$25,000" />
    );
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <StatCard
        title="Test"
        value="123"
        className="custom-class"
      />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
