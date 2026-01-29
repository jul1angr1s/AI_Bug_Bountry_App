import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../../../components/Sidebar/Sidebar';

describe('Sidebar', () => {
  const renderSidebar = () => {
    return render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );
  };

  it('renders Thunder Security branding', () => {
    renderSidebar();
    expect(screen.getByText(/Thunder Security/i)).toBeInTheDocument();
  });

  it('renders all navigation links', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /protocols/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /scans/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /validations/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /payments/i })).toBeInTheDocument();
  });

  it('renders user profile section', () => {
    renderSidebar();
    expect(screen.getByText('Security Ops')).toBeInTheDocument();
  });

  it('has fixed width of 200px', () => {
    const { container } = renderSidebar();
    const sidebar = container.firstChild as HTMLElement;
    expect(sidebar).toHaveClass('w-[200px]');
  });

  it('has dark background matching design system', () => {
    const { container } = renderSidebar();
    const sidebar = container.firstChild as HTMLElement;
    expect(sidebar).toHaveClass('bg-navy-800');
  });
});
