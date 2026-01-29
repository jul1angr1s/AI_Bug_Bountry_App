import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../lib/auth';
import ProtectedRoute from '../../components/ProtectedRoute';

describe('ProtectedRoute', () => {
  it('renders ProtectedRoute component', () => {
    // This test verifies the component can be instantiated
    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </BrowserRouter>
    );

    expect(container).toBeTruthy();
  });

  it('renders children when user is authenticated', async () => {
    // Set up authenticated state
    localStorage.setItem('wallet', '0x123');

    render(
      <BrowserRouter>
        <AuthProvider>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </BrowserRouter>
    );

    // Should eventually show protected content
    await screen.findByText('Protected Content');

    // Cleanup
    localStorage.removeItem('wallet');
  });

  it('redirects to login when user is not authenticated', async () => {
    // Ensure no stored wallet
    localStorage.removeItem('wallet');

    render(
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            } />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    );

    // Should redirect to login
    await screen.findByText('Login Page');
  });
});
