import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../lib/auth';
import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    );
    // Check for Thunder Security branding (unique to sidebar)
    expect(screen.getByText('Thunder Security')).toBeInTheDocument();
    // Verify app renders
    expect(container).toBeTruthy();
  });
});
