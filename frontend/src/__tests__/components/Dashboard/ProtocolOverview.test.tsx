import { render, screen } from '@testing-library/react';
import ProtocolOverview from '../../../components/Dashboard/ProtocolOverview';
import type { Protocol } from '../../../types/dashboard';

describe('ProtocolOverview', () => {
  const mockProtocol: Protocol = {
    id: '1',
    name: 'DeFi Protocol',
    contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
    status: 'MONITORING',
    bountyPool: '$50,000',
  };

  it('renders protocol name', () => {
    render(<ProtocolOverview protocol={mockProtocol} />);
    expect(screen.getByText('DeFi Protocol')).toBeInTheDocument();
  });

  it('renders truncated contract address', () => {
    render(<ProtocolOverview protocol={mockProtocol} />);
    expect(screen.getByText(/0x1234...5678/i)).toBeInTheDocument();
  });

  it('renders monitoring status', () => {
    render(<ProtocolOverview protocol={mockProtocol} />);
    expect(screen.getByText('MONITORING')).toBeInTheDocument();
  });

  it('renders bounty pool amount', () => {
    render(<ProtocolOverview protocol={mockProtocol} />);
    expect(screen.getByText('$50,000')).toBeInTheDocument();
  });

  it('displays protocol label', () => {
    render(<ProtocolOverview protocol={mockProtocol} />);
    expect(screen.getByText('Protocol')).toBeInTheDocument();
  });
});
