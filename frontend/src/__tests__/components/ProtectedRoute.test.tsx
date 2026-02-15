import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import ProtectedRoute from '../../components/ProtectedRoute';
import * as auth from '../../lib/auth';

// Mock the useAuth hook
vi.mock('../../lib/auth', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ProtectedRoute', () => {
  const mockSession = {
    access_token: 'token',
    refresh_token: 'refresh',
    user: { id: '1', email: 'test@wallet.local' },
  } as any;

  it('renders ProtectedRoute component', () => {
    vi.spyOn(auth, 'useAuth').mockReturnValue({
      user: { id: '1', wallet: '0x123', role: 'User' },
      session: mockSession,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const { container } = render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(container).toBeTruthy();
  });

  it('renders children when user is authenticated', async () => {
    vi.spyOn(auth, 'useAuth').mockReturnValue({
      user: { id: '1', wallet: '0x123', role: 'User' },
      session: mockSession,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('redirects to login when user is not authenticated', async () => {
    vi.spyOn(auth, 'useAuth').mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('redirects to login when user exists but session is missing', async () => {
    vi.spyOn(auth, 'useAuth').mockReturnValue({
      user: { id: '1', wallet: '0x123', role: 'User' },
      session: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });
});
