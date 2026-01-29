import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NavLink from '../../../components/Sidebar/NavLink';

describe('NavLink', () => {
  const renderNavLink = (props: { label: string; path: string; icon?: string }) => {
    return render(
      <BrowserRouter>
        <NavLink {...props} />
      </BrowserRouter>
    );
  };

  it('renders the navigation link with label', () => {
    renderNavLink({ label: 'Dashboard', path: '/' });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders as a link with correct href', () => {
    renderNavLink({ label: 'Protocols', path: '/protocols' });
    const link = screen.getByRole('link', { name: /protocols/i });
    expect(link).toHaveAttribute('href', '/protocols');
  });

  it('applies active styling when on current route', () => {
    window.history.pushState({}, '', '/');
    renderNavLink({ label: 'Dashboard', path: '/' });
    const link = screen.getByRole('link', { name: /dashboard/i });
    // Should have active styling classes
    expect(link.className).toContain('bg-primary');
  });

  it('renders without icon when not provided', () => {
    renderNavLink({ label: 'Dashboard', path: '/' });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
