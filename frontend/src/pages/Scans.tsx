import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Filter, RefreshCw, Search as SearchIcon } from 'lucide-react';
import ScanCard from '../components/scans/ScanCard';
import { LoadingSkeleton } from '../components/shared/LoadingSkeleton';
import { useScans, useScansRealtime } from '../hooks/useScans';

export default function Scans() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const protocolId = searchParams.get('protocolId') || undefined;

  // Fetch scans with filters (all scans if no protocolId)
  const { data, isLoading, isError, error, refetch, isFetching } = useScans({
    protocolId,
    status: statusFilter || undefined,
    limit: 50,
  });

  // Subscribe to real-time updates
  useScansRealtime(protocolId);

  const handleRefresh = () => {
    refetch();
  };

  const handleProtocolFilter = (newProtocolId: string) => {
    if (newProtocolId) {
      setSearchParams({ protocolId: newProtocolId });
    } else {
      setSearchParams({});
    }
  };

  // Empty state when no scans at all
  if (!isLoading && !isError && data && data.scans.length === 0 && !statusFilter && !protocolId) {
    return (
      <div className="min-h-screen bg-[#0f1419] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Scans</h1>
              <p className="text-gray-400 mt-1">No scans found</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mb-6">
              <Plus className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Scans Yet</h2>
            <p className="text-gray-400 text-center max-w-md mb-8">
              No protocols have been scanned yet. Register a protocol to start analyzing for vulnerabilities.
            </p>
            <button
              onClick={() => navigate('/protocols')}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all"
            >
              View Protocols
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {protocolId ? 'Protocol Scans' : 'All Scans'}
            </h1>
            <p className="text-gray-400 mt-1">
              {data?.total || 0} scan{data?.total !== 1 ? 's' : ''} {protocolId ? 'for this protocol' : 'across all protocols'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="p-2 bg-[#1a1f2e] border border-gray-800 rounded-lg text-gray-400 hover:text-white hover:border-gray-700 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-gray-400">
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filter:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-[#1a1f2e] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="QUEUED">Queued</option>
              <option value="RUNNING">Running</option>
              <option value="SUCCEEDED">Succeeded</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELED">Canceled</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <LoadingSkeleton key={i} className="h-64" />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-400 font-medium mb-2">Failed to load scans</p>
            <p className="text-gray-400 text-sm mb-4">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Scans Grid */}
        {!isLoading && !isError && data && data.scans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.scans.map((scan) => (
              <ScanCard key={scan.id} scan={scan} />
            ))}
          </div>
        )}

        {/* No Results with Filter */}
        {!isLoading && !isError && data && data.scans.length === 0 && statusFilter && (
          <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-12 text-center">
            <SearchIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No scans found</h3>
            <p className="text-gray-400 mb-4">
              No scans match the current filter: <span className="text-blue-400">{statusFilter}</span>
            </p>
            <button
              onClick={() => setStatusFilter('')}
              className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
