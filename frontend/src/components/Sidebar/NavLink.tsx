import { NavLink as RouterNavLink } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
}

export default function NavLink({ to, icon: Icon, label }: NavLinkProps) {
  return (
    <RouterNavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          'hover:bg-navy-800',
          isActive
            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
            : 'text-gray-400 hover:text-gray-200'
        )
      }
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </RouterNavLink>
  );
}
