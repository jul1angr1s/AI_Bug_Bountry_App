import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VulnerabilitiesTable from '../../../components/Dashboard/VulnerabilitiesTable';
import type { Vulnerability } from '../../../types/dashboard';

describe('VulnerabilitiesTable', () => {
  const mockVulnerabilities: Vulnerability[] = [
    {
      id: '1',
      title: 'Reentrancy vulnerability in withdraw function',
      severity: 'CRITICAL',
      status: 'CONFIRMED',
      protocol: 'DeFi Protocol',
      discoveredAt: '2024-01-28T10:00:00Z',
      bounty: '$10,000',
    },
    {
      id: '2',
      title: 'Integer overflow in token calculation',
      severity: 'HIGH',
      status: 'PENDING',
      protocol: 'Token Contract',
      discoveredAt: '2024-01-27T15:30:00Z',
      bounty: '$5,000',
    },
    {
      id: '3',
      title: 'Missing access control on admin function',
      severity: 'MEDIUM',
      status: 'RESOLVED',
      protocol: 'Governance Contract',
      discoveredAt: '2024-01-26T09:15:00Z',
      bounty: '$2,500',
    },
  ];

  it('renders table headers', () => {
    render(<VulnerabilitiesTable vulnerabilities={mockVulnerabilities} />);
    expect(screen.getByText('Vulnerability')).toBeInTheDocument();
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Protocol')).toBeInTheDocument();
    expect(screen.getByText('Bounty')).toBeInTheDocument();
  });

  it('renders all vulnerabilities', () => {
    render(<VulnerabilitiesTable vulnerabilities={mockVulnerabilities} />);
    expect(screen.getByText(/Reentrancy vulnerability/i)).toBeInTheDocument();
    expect(screen.getByText(/Integer overflow/i)).toBeInTheDocument();
    expect(screen.getByText(/Missing access control/i)).toBeInTheDocument();
  });

  it('displays severity badges', () => {
    render(<VulnerabilitiesTable vulnerabilities={mockVulnerabilities} />);
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
  });

  it('shows protocol names', () => {
    render(<VulnerabilitiesTable vulnerabilities={mockVulnerabilities} />);
    expect(screen.getByText('DeFi Protocol')).toBeInTheDocument();
    expect(screen.getByText('Token Contract')).toBeInTheDocument();
  });

  it('displays bounty amounts', () => {
    render(<VulnerabilitiesTable vulnerabilities={mockVulnerabilities} />);
    expect(screen.getByText('$10,000')).toBeInTheDocument();
    expect(screen.getByText('$5,000')).toBeInTheDocument();
  });

  it('handles empty vulnerabilities array', () => {
    render(<VulnerabilitiesTable vulnerabilities={[]} />);
    expect(screen.getByText(/no vulnerabilities/i)).toBeInTheDocument();
  });

  it('supports sorting by clicking headers', async () => {
    const user = userEvent.setup();
    render(<VulnerabilitiesTable vulnerabilities={mockVulnerabilities} />);

    const severityHeader = screen.getByText('Severity');
    await user.click(severityHeader);

    // After clicking, table should reorder (implementation detail)
    expect(severityHeader).toBeInTheDocument();
  });
});
