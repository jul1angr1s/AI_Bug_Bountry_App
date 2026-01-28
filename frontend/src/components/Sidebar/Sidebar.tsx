import { LayoutDashboard, Shield, ScanLine, CheckCircle, DollarSign, Zap } from 'lucide-react';
import NavLink from './NavLink';
import UserProfile from './UserProfile';

export default function Sidebar() {
  return (
    <aside className="w-[200px] bg-navy-900 border-r border-navy-800 flex flex-col">
      {/* Brand */}
      <div className="h-16 flex items-center gap-2 px-4 border-b border-navy-800">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white">Thunder Security</h1>
          <p className="text-xs text-gray-400">Orchestrator v2.1</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        <NavLink to="/" icon={LayoutDashboard} label="Dashboard" />
        <NavLink to="/protocols" icon={Shield} label="Protocols" />
        <NavLink to="/scans" icon={ScanLine} label="Scans" />
        <NavLink to="/validations" icon={CheckCircle} label="Validations" />
        <NavLink to="/payments" icon={DollarSign} label="Payments" />
      </nav>

      {/* User Profile */}
      <UserProfile />
    </aside>
  );
}
