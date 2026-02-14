import { render, screen, waitFor } from '@testing-library/react';
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
      <button onClick={signIn}>Sign In</button>
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

  it('provides auth context to children', async () => {
    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toBeInTheDocument();
    });
  });

  it('initially shows not logged in', async () => {
    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });
  });

  it('provides signIn function', async () => {
    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });
  });

  it('provides signOut function', async () => {
    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });
  });
});
