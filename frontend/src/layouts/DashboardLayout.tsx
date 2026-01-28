import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar/Sidebar';

export default function DashboardLayout() {
  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden">
      {/* Fixed Sidebar - 200px */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-navy-800 flex items-center justify-between px-6">
          <div className="text-sm text-gray-400">
            {/* Breadcrumb or page title will go here */}
          </div>
          <div className="flex items-center gap-4">
            {/* Theme toggle and user profile will go here */}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
