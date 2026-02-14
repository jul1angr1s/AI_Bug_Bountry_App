import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, RefreshCw } from 'lucide-react';
import ModernProtocolCard from '../components/protocols/ModernProtocolCard';
import { ProtocolStatsCard } from '../components/protocols/ProtocolStatsCard';
import { StatusFilterChips } from '../components/protocols/StatusFilterChips';
import { ProtocolSearchBar } from '../components/protocols/ProtocolSearchBar';
import { LoadingSkeleton } from '../components/shared/LoadingSkeleton';
import ContractBadge from '../components/shared/ContractBadge';
import { getContractByName } from '../lib/contracts';
import { useProtocols, useProtocolsRealtime } from '../hooks/useProtocols';
import type { ProtocolListItem } from '../lib/api';
import type { Protocol } from '../types/dashboard';

// Adapter function to convert ProtocolListItem to Protocol
const adaptProtocolListItem = (item: ProtocolListItem): Protocol => {
  return {
    id: item.id,
    contractName: item.name,
    githubUrl: item.githubUrl,
    branch: 'main', // Default value - not available in ProtocolListItem
    contractPath: '', // Default value - not available in ProtocolListItem
    status: item.status,
    registrationState: '', // Default value - not available in ProtocolListItem
    ownerAddress: '', // Default value - not available in ProtocolListItem
    totalBountyPool: '0', // Default value - not available in ProtocolListItem
    availableBounty: '0', // Default value - not available in ProtocolListItem
    paidBounty: '0', // Default value - not available in ProtocolListItem
    riskScore: item.riskScore,
    createdAt: item.createdAt,
    updatedAt: item.createdAt, // Use createdAt as fallback
    scansCount: item.scansCount,
    vulnerabilitiesCount: item.vulnerabilitiesCount,
    lastScanAt: null, // Default value - not available in ProtocolListItem
    version: item.version,
    registrationType: item.registrationType,
  };
};

export default function Protocols() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
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

  // Calculate stats from protocols data
  const stats = useMemo(() => {
    if (!data?.protocols) {
      return {
        totalValueSecured: 0,
        activeBounties: 0,
        bountiesPaid: 0,
        findingsFixed: 0,
      };
    }

    return {
      totalValueSecured: 0, // Not available in ProtocolListItem
      activeBounties: data.protocols.filter(p => p.status === 'ACTIVE').length,
      bountiesPaid: 0, // Not available in ProtocolListItem
      findingsFixed: data.protocols.reduce((sum, p) => {
        return sum + (p.vulnerabilitiesCount || 0);
      }, 0),
    };
  }, [data?.protocols]);

  // Filter protocols by search query
  const filteredProtocols = useMemo(() => {
    if (!data?.protocols) return [];
    if (!searchQuery) return data.protocols;

    const query = searchQuery.toLowerCase();
    return data.protocols.filter(protocol =>
      protocol.name.toLowerCase().includes(query) ||
      protocol.githubUrl.toLowerCase().includes(query)
    );
  }, [data?.protocols, searchQuery]);

  const handleRegisterProtocol = () => {
    navigate('/protocols/register');
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleStatusChange = (status: string | null) => {
    setStatusFilter(status);
    setPage(1); // Reset to first page on filter change
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1); // Reset to first page on search change
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    }
    if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(1)}k`;
    }
    return `$${value.toFixed(2)}`;
  };

  // Empty state
  if (!isLoading && !isError && data?.protocols.length === 0 && !statusFilter && !searchQuery) {
    return (
      <div className="min-h-screen bg-[#0f1419] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white font-['Space_Grotesk']">Protocols</h1>
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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white font-['Space_Grotesk']">Protocols</h1>
              {getContractByName('ProtocolRegistry') && (
                <ContractBadge variant="inline" contract={getContractByName('ProtocolRegistry')!} />
              )}
            </div>
            <p className="text-gray-400 mt-1">
              {data?.pagination.total || 0} registered protocol{data?.pagination.total !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="p-2 bg-[#162030] border border-[#2f466a] rounded-lg text-gray-400 hover:text-white hover:border-[#3f567a] transition-colors disabled:opacity-50"
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

        {/* Stats Section */}
        {!isLoading && !isError && data && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <ProtocolStatsCard
              icon="account_balance"
              label="Total Value Secured"
              value={formatCurrency(stats.totalValueSecured)}
              growth={`${data.pagination.total} protocols`}
              growthColor="gray"
            />
            <ProtocolStatsCard
              icon="emoji_events"
              label="Active Bounties"
              value={stats.activeBounties.toString()}
              growth={`${Math.round((stats.activeBounties / (data.pagination.total || 1)) * 100)}% active`}
              growthColor="green"
            />
            <ProtocolStatsCard
              icon="paid"
              label="Bounties Paid"
              value={formatCurrency(stats.bountiesPaid)}
              growth={`${data.pagination.total} protocols`}
              growthColor="gray"
            />
            <ProtocolStatsCard
              icon="bug_report"
              label="Findings Fixed"
              value={stats.findingsFixed.toString()}
              growth={`${(stats.findingsFixed / (data.pagination.total || 1)).toFixed(1)} avg per protocol`}
              growthColor="gray"
            />
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
          {/* Search Bar */}
          <ProtocolSearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by name or address..."
          />

          {/* Status Filter Chips */}
          <StatusFilterChips
            selectedStatus={statusFilter}
            onStatusChange={handleStatusChange}
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <LoadingSkeleton key={i} className="h-96" />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
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

        {/* Protocols Grid */}
        {!isLoading && !isError && data && filteredProtocols.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProtocols.map((protocol) => (
                <ModernProtocolCard key={protocol.id} protocol={adaptProtocolListItem(protocol)} onDelete={() => refetch()} />
              ))}
            </div>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-[#162030] border border-[#2f466a] rounded-lg text-white hover:border-[#3f567a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                              : 'bg-[#162030] border border-[#2f466a] text-gray-400 hover:text-white hover:border-[#3f567a]'
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
                  className="px-4 py-2 bg-[#162030] border border-[#2f466a] rounded-lg text-white hover:border-[#3f567a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* No Results with Filter or Search */}
        {!isLoading && !isError && data && filteredProtocols.length === 0 && (statusFilter || searchQuery) && (
          <div className="bg-[#162030] border border-[#2f466a] rounded-xl p-12 text-center">
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No protocols found</h3>
            <p className="text-gray-400 mb-4">
              {searchQuery && statusFilter ? (
                <>
                  No protocols match your search "{searchQuery}" with status{' '}
                  <span className="text-purple-400">{statusFilter}</span>
                </>
              ) : searchQuery ? (
                <>No protocols match your search "{searchQuery}"</>
              ) : (
                <>
                  No protocols match the current filter:{' '}
                  <span className="text-purple-400">{statusFilter}</span>
                </>
              )}
            </p>
            <div className="flex items-center justify-center gap-2">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                >
                  Clear Search
                </button>
              )}
              {statusFilter && (
                <button
                  onClick={() => setStatusFilter(null)}
                  className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
