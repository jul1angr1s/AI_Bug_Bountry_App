import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import NavLink from './NavLink';
import UserProfile from './UserProfile';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/' },
  { label: 'Protocols', path: '/protocols' },
  { label: 'Scans', path: '/scans' },
  { label: 'Validations', path: '/validations' },
  { label: 'Payments', path: '/payments' },
  { label: 'Agents', path: '/agents' },
  { label: 'x402 Payments', path: '/x402-payments' },
  { label: 'Contracts', path: '/contracts' },
];

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-navy-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMobileMenuOpen}
        aria-controls="sidebar-nav"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6" aria-hidden="true" />
        ) : (
          <Menu className="w-6 h-6" aria-hidden="true" />
        )}
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar-nav"
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-[200px] bg-navy-800 h-screen flex flex-col
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Branding */}
        <div className="p-4 border-b border-navy-900">
          <h1 className="text-lg font-bold text-white">Thunder Security</h1>
          <p className="text-xs text-gray-400 mt-1">v1.0.0</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              label={item.label}
              path={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
            />
          ))}
        </nav>

        {/* User Profile */}
        <UserProfile />
      </aside>
    </>
  );
}
