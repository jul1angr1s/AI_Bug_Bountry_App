import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../lib/auth';
import Sidebar from '../../../components/Sidebar/Sidebar';

describe('Sidebar', () => {
  const renderSidebar = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <Sidebar />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renders Thunder Security branding', async () => {
    renderSidebar();
    await waitFor(() => {
      expect(screen.getByText(/Thunder Security/i)).toBeInTheDocument();
    });
  });

  it('renders all navigation links', async () => {
    renderSidebar();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /protocols/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /scans/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /validations/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /payments/i })).toBeInTheDocument();
  });

  it('renders user profile section', async () => {
    renderSidebar();
    await waitFor(() => {
      expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
    });
  });

  it('has fixed width of 200px', async () => {
    const { container } = renderSidebar();
    await waitFor(() => {
      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar).toHaveClass('w-[200px]');
    });
  });

  it('has dark background matching design system', async () => {
    const { container } = renderSidebar();
    await waitFor(() => {
      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar).toHaveClass('bg-navy-800');
    });
  });
});
