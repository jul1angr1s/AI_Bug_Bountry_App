import { useParams } from 'react-router-dom';
import { useScan } from '../../hooks/useScans';
import { ScanDashboardModern } from '../../pages/ScanDashboardModern';
import ScanDetail from '../../pages/ScanDetail';

/**
 * Router component that conditionally renders either:
 * - Modern dashboard (for RUNNING scans)
 * - Classic detail view (for COMPLETED, FAILED, CANCELED scans)
 */
export function ScanDetailRouter() {
  const { id } = useParams<{ id: string }>();
  const scanId = id!;

  const { data: scan, isLoading, isError } = useScan(scanId);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
          <p className="mt-4 text-slate-400">Loading scan...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !scan) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-status-critical">error</span>
          <h2 className="mt-4 text-2xl font-bold text-white">Scan not found</h2>
          <p className="mt-2 text-slate-400">Scan ID: {scanId}</p>
          <a
            href="/scans"
            className="mt-6 inline-block px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
          >
            Back to Scans
          </a>
        </div>
      </div>
    );
  }

  // Conditional rendering based on scan state
  if (scan.state === 'RUNNING') {
    return <ScanDashboardModern />;
  }

  // For COMPLETED, FAILED, CANCELED states, show classic detail view
  return <ScanDetail />;
}
