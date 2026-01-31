import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import UserProfile from '../../../components/Sidebar/UserProfile';
import * as auth from '../../../lib/auth';

// Mock the useAuth hook
vi.mock('../../../lib/auth', () => ({
  useAuth: vi.fn(),
}));

describe('UserProfile', () => {
  it('renders sign in button when not authenticated', () => {
    vi.spyOn(auth, 'useAuth').mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    render(<UserProfile />);
    expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  it('renders user info when authenticated', () => {
    vi.spyOn(auth, 'useAuth').mockReturnValue({
      user: {
        id: '1',
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
        role: 'Security Ops',
      },
      session: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    render(<UserProfile />);
    expect(screen.getByText('Security Ops')).toBeInTheDocument();
    expect(screen.getByText(/0x1234...5678/i)).toBeInTheDocument();
  });

  it('renders loading state', () => {
    vi.spyOn(auth, 'useAuth').mockReturnValue({
      user: null,
      session: null,
      loading: true,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const { container } = render(<UserProfile />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays user icon when authenticated', () => {
    vi.spyOn(auth, 'useAuth').mockReturnValue({
      user: {
        id: '1',
        wallet: '0x1234567890abcdef1234567890abcdef12345678',
        role: 'Security Ops',
      },
      session: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    render(<UserProfile />);
    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
  });
});
