import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../lib/auth';
import DashboardLayout from '../../layouts/DashboardLayout';

describe('DashboardLayout', () => {
  const renderLayout = (children: React.ReactNode = <div>Test Content</div>) => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renders sidebar', async () => {
    renderLayout();
    await waitFor(() => {
      expect(screen.getByText(/Thunder Security/i)).toBeInTheDocument();
    });
  });

  it('renders children content', async () => {
    renderLayout(<div>Custom Test Content</div>);
    await waitFor(() => {
      expect(screen.getByText('Custom Test Content')).toBeInTheDocument();
    });
  });

  it('has fixed sidebar and fluid content area', async () => {
    const { container } = renderLayout();
    await waitFor(() => {
      expect(container.firstChild).toHaveClass('flex');
    });
  });

  it('content area takes remaining space', async () => {
    const { container } = renderLayout();
    await waitFor(() => {
      const contentArea = container.querySelector('[data-testid="content-area"]');
      expect(contentArea).toHaveClass('flex-1');
    });
  });

  it('has minimum height of screen', async () => {
    const { container } = renderLayout();
    await waitFor(() => {
      expect(container.firstChild).toHaveClass('min-h-screen');
    });
  });
});
