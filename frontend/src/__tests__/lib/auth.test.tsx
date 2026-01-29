import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../lib/auth';

// Test component that uses the auth context
function TestComponent() {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div data-testid="user-status">
        {user ? `Logged in: ${user.wallet}` : 'Not logged in'}
      </div>
      <button onClick={() => signIn('0x123')}>Sign In</button>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}

describe('Auth Context', () => {
  const renderWithAuth = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('provides auth context to children', () => {
    renderWithAuth();
    expect(screen.getByTestId('user-status')).toBeInTheDocument();
  });

  it('initially shows not logged in', () => {
    renderWithAuth();
    expect(screen.getByText('Not logged in')).toBeInTheDocument();
  });

  it('provides signIn function', () => {
    renderWithAuth();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('provides signOut function', () => {
    renderWithAuth();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });
});
