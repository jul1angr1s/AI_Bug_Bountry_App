import NavLink from './NavLink';
import UserProfile from './UserProfile';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/' },
  { label: 'Protocols', path: '/protocols' },
  { label: 'Scans', path: '/scans' },
  { label: 'Validations', path: '/validations' },
  { label: 'Payments', path: '/payments' },
];

export default function Sidebar() {
  return (
    <aside className="w-[200px] bg-navy-800 h-screen flex flex-col">
      {/* Branding */}
      <div className="p-4 border-b border-navy-900">
        <h1 className="text-lg font-bold text-white">Thunder Security</h1>
        <p className="text-xs text-gray-400 mt-1">v1.0.0</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.path} label={item.label} path={item.path} />
        ))}
      </nav>

      {/* User Profile */}
      <UserProfile role="Security Ops" walletAddress="0x1234567890abcdef1234567890abcdef12345678" />
    </aside>
  );
}
