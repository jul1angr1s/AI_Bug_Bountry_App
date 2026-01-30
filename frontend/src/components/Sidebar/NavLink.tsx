import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavLinkProps {
  label: string;
  path: string;
  icon?: string;
  onClick?: () => void;
}

export default function NavLink({ label, path, onClick }: NavLinkProps) {
  const location = useLocation();
  const isActive = location.pathname === path;

  return (
    <Link
      to={path}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-navy-800',
        isActive
          ? 'bg-primary text-white'
          : 'text-gray-300 hover:bg-navy-900 hover:text-white'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
