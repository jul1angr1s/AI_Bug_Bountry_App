import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, Grid3x3, List, Search, RefreshCw } from 'lucide-react';
import ProtocolCard from '../components/protocols/ProtocolCard';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import { useProtocols, useProtocolsRealtime } from '../hooks/useProtocols';

type ViewMode = 'grid' | 'list';

export default function Protocols() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 12;

  // Fetch protocols with filters
  const { data, isLoading, isError, error, refetch, isFetching } = useProtocols({
    status: statusFilter || undefined,
    page,
    limit,
  });

  // Subscribe to real-time updates
  useProtocolsRealtime();

  const handleRegisterProtocol = () => {
    navigate('/protocols/register');
  };

  const handleRefresh = () => {
    refetch();
  };

  // Empty state
  if (!isLoading && !isError && data?.protocols.length === 0 && !statusFilter) {
    return (
      <div className="min-h-screen bg-[#0f1419] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Protocols</h1>
              <p className="text-gray-400 mt-1">Manage your registered smart contract protocols</p>
            </div>
          </div>

          {/* Empty State */}
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mb-6">
              <Plus className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Protocols Yet</h2>
            <p className="text-gray-400 text-center max-w-md mb-8">
              Get started by registering your first smart contract protocol. Our automated agents
              will analyze it and begin scanning for vulnerabilities.
            </p>
            <button
              onClick={handleRegisterProtocol}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#0f1419] transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Register Your First Protocol
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
            <h1 className="text-3xl font-bold text-white">Protocols</h1>
            <p className="text-gray-400 mt-1">
              {data?.pagination.total || 0} registered protocol{data?.pagination.total !== 1 ? 's' : ''}
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
            <button
              onClick={handleRegisterProtocol}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Register Protocol
            </button>
          </div>
        </div>

        {/* Filters and View Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-gray-400">
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filter:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1); // Reset to first page on filter change
              }}
              className="px-4 py-2 bg-[#1a1f2e] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="DEPRECATED">Deprecated</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-[#1a1f2e] border border-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white'
              } transition-colors`}
              title="Grid View"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${
                viewMode === 'list'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white'
              } transition-colors`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
            {[...Array(6)].map((_, i) => (
              <LoadingSkeleton key={i} className="h-64" />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-400 font-medium mb-2">Failed to load protocols</p>
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

        {/* Protocols Grid/List */}
        {!isLoading && !isError && data && data.protocols.length > 0 && (
          <>
            <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
              {data.protocols.map((protocol) => (
                <ProtocolCard key={protocol.id} protocol={protocol} />
              ))}
            </div>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-[#1a1f2e] border border-gray-800 rounded-lg text-white hover:border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {[...Array(data.pagination.totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    // Show first, last, current, and adjacent pages
                    if (
                      pageNum === 1 ||
                      pageNum === data.pagination.totalPages ||
                      Math.abs(pageNum - page) <= 1
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            page === pageNum
                              ? 'bg-purple-500 text-white'
                              : 'bg-[#1a1f2e] border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (pageNum === page - 2 || pageNum === page + 2) {
                      return <span key={pageNum} className="text-gray-600">...</span>;
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                  className="px-4 py-2 bg-[#1a1f2e] border border-gray-800 rounded-lg text-white hover:border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* No Results with Filter */}
        {!isLoading && !isError && data && data.protocols.length === 0 && statusFilter && (
          <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-12 text-center">
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No protocols found</h3>
            <p className="text-gray-400 mb-4">
              No protocols match the current filter: <span className="text-purple-400">{statusFilter}</span>
            </p>
            <button
              onClick={() => setStatusFilter('')}
              className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
