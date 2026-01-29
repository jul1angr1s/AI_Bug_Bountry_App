import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavLinkProps {
  label: string;
  path: string;
  icon?: string;
}

export default function NavLink({ label, path }: NavLinkProps) {
  const location = useLocation();
  const isActive = location.pathname === path;

  return (
    <Link
      to={path}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
        isActive
          ? 'bg-primary text-white'
          : 'text-gray-300 hover:bg-navy-900 hover:text-white'
      )}
    >
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
