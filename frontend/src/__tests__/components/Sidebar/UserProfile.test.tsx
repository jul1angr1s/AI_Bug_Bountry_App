import { render, screen } from '@testing-library/react';
import UserProfile from '../../../components/Sidebar/UserProfile';

describe('UserProfile', () => {
  it('renders user role', () => {
    render(<UserProfile role="Security Ops" />);
    expect(screen.getByText('Security Ops')).toBeInTheDocument();
  });

  it('renders truncated wallet address when provided', () => {
    render(
      <UserProfile
        role="Security Ops"
        walletAddress="0x1234567890abcdef1234567890abcdef12345678"
      />
    );
    expect(screen.getByText(/0x1234...5678/i)).toBeInTheDocument();
  });

  it('does not render wallet address when not provided', () => {
    render(<UserProfile role="Security Ops" />);
    expect(screen.queryByText(/0x/i)).not.toBeInTheDocument();
  });

  it('displays user icon/avatar', () => {
    const { container } = render(<UserProfile role="Security Ops" />);
    // Check for user icon or avatar element
    expect(container.querySelector('[data-testid="user-icon"]')).toBeInTheDocument();
  });
});
