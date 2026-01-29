import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';

describe('DashboardLayout', () => {
  const renderLayout = (children: React.ReactNode = <div>Test Content</div>) => {
    return render(
      <BrowserRouter>
        <DashboardLayout>{children}</DashboardLayout>
      </BrowserRouter>
    );
  };

  it('renders sidebar', () => {
    renderLayout();
    expect(screen.getByText(/Thunder Security/i)).toBeInTheDocument();
  });

  it('renders children content', () => {
    renderLayout(<div>Custom Test Content</div>);
    expect(screen.getByText('Custom Test Content')).toBeInTheDocument();
  });

  it('has fixed sidebar and fluid content area', () => {
    const { container } = renderLayout();
    // Check for flex layout
    expect(container.firstChild).toHaveClass('flex');
  });

  it('content area takes remaining space', () => {
    const { container } = renderLayout();
    const contentArea = container.querySelector('[data-testid="content-area"]');
    expect(contentArea).toHaveClass('flex-1');
  });

  it('has minimum height of screen', () => {
    const { container } = renderLayout();
    expect(container.firstChild).toHaveClass('min-h-screen');
  });
});
