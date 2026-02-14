import { render, screen } from '@testing-library/react';
import SeverityBadge from '../../../components/shared/SeverityBadge';

describe('SeverityBadge', () => {
  it('renders severity level', () => {
    render(<SeverityBadge severity="CRITICAL" />);
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('applies red color for CRITICAL severity', () => {
    const { container } = render(<SeverityBadge severity="CRITICAL" />);
    expect(container.firstChild).toHaveClass('bg-status-critical');
  });

  it('applies orange color for HIGH severity', () => {
    const { container } = render(<SeverityBadge severity="HIGH" />);
    expect(container.firstChild).toHaveClass('bg-orange-500');
  });

  it('applies yellow color for MEDIUM severity', () => {
    const { container } = render(<SeverityBadge severity="MEDIUM" />);
    expect(container.firstChild).toHaveClass('bg-yellow-500');
  });

  it('applies gray color for LOW severity', () => {
    const { container } = render(<SeverityBadge severity="LOW" />);
    expect(container.firstChild).toHaveClass('bg-gray-500');
  });

  it('applies blue color for INFO severity', () => {
    const { container } = render(<SeverityBadge severity="INFO" />);
    expect(container.firstChild).toHaveClass('bg-status-info');
  });
});
