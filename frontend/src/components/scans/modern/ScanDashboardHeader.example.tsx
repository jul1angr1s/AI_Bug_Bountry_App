/**
 * Example usage of ScanDashboardHeader component
 *
 * This file demonstrates how to integrate the ScanDashboardHeader component
 * into a scan detail page with proper data fetching and state management.
 */

import { ScanDashboardHeader } from './ScanDashboardHeader';
import { useQuery } from '@tanstack/react-query';
import { fetchScan } from '../../../lib/api';

export function ScanDashboardHeaderExample() {
  const scanId = 'example-scan-id';

  // Fetch scan data using React Query
  const { data: scan, refetch } = useQuery({
    queryKey: ['scan', scanId],
    queryFn: () => fetchScan(scanId),
  });

  if (!scan) {
    return <div>Loading...</div>;
  }

  return (
    <ScanDashboardHeader
      scan={scan}
      contractAddress="0x1f9840a85d5af5bf1d1762f925bdaddc4201f984"
      onScanUpdate={() => {
        // Refresh scan data after abort
        refetch();
      }}
    />
  );
}

/**
 * Usage in a page component:
 *
 * ```tsx
 * import { ScanDashboardHeader } from '@/components/scans/modern/ScanDashboardHeader';
 *
 * export function ScanDetailPage() {
 *   const { scanId } = useParams();
 *   const { data: scan } = useScan(scanId);
 *
 *   return (
 *     <div className="min-h-screen bg-background-dark p-6">
 *       <ScanDashboardHeader
 *         scan={scan}
 *         contractAddress={scan.protocol?.contractAddress}
 *         onScanUpdate={() => {
 *           // Handle scan state update (e.g., refetch data)
 *         }}
 *       />
 *       {/* Rest of the dashboard content *\/}
 *     </div>
 *   );
 * }
 * ```
 */
