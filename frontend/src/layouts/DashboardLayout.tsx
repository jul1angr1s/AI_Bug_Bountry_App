import Sidebar from '@/components/Sidebar/Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-navy-900">
      <Sidebar />
      <main className="flex-1 overflow-auto" data-testid="content-area">
        {children}
      </main>
    </div>
  );
}
