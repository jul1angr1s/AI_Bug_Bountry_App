import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Clock, X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebSocket } from '@/hooks/useWebSocket';
import { fetchPayments } from '@/lib/api';
import SeverityBadge from '@/components/shared/SeverityBadge';
import type { Payment, PaymentStatus, SeverityLevel } from '@/types/dashboard';

/**
 * Props interface for PaymentHistory component
 */
export interface PaymentHistoryProps {
  protocolId?: string; // Optional protocol filter
}

/**
 * Truncate Ethereum address for display
 * Example: 0x1234567890abcdef1234567890abcdef12345678 -> 0x1234...5678
 */
const truncateAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Format date as MMM DD, YYYY HH:mm
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${month} ${day}, ${year} ${hours}:${minutes}`;
};

/**
 * Format USDC amount with 2 decimals
 */
const formatAmount = (amount: string): string => {
  const num = parseFloat(amount);
  return num.toFixed(2);
};

/**
 * Get Basescan transaction URL
 */
const getBasescanUrl = (txHash: string): string => {
  return `https://sepolia.basescan.org/tx/${txHash}`;
};

/**
 * Status indicator component
 */
interface StatusIndicatorProps {
  status: PaymentStatus;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const indicators = {
    COMPLETED: {
      icon: <Check className="w-4 h-4" />,
      label: 'Paid',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    PENDING: {
      icon: <Clock className="w-4 h-4" />,
      label: 'Processing',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    FAILED: {
      icon: <X className="w-4 h-4" />,
      label: 'Failed',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  };

  const indicator = indicators[status];

  return (
    <div className={cn('inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full', indicator.bgColor)}>
      <span className={indicator.color}>{indicator.icon}</span>
      <span className={cn('text-xs font-medium', indicator.color)}>{indicator.label}</span>
    </div>
  );
};

/**
 * PaymentHistory Component
 *
 * Displays paginated payment history with:
 * - Payment table with Date, Protocol, Researcher, Severity, Amount, Status, Transaction columns
 * - Filter controls (Status, Severity, Date Range)
 * - Pagination controls
 * - Real-time WebSocket updates
 * - Loading and error states
 *
 * Requirements from OpenSpec tasks 15.1-15.10
 */
export const PaymentHistory: React.FC<PaymentHistoryProps> = ({ protocolId }) => {
  // WebSocket connection
  const { subscribe } = useWebSocket();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'ALL'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Local state for real-time updates
  const [localPayments, setLocalPayments] = useState<Payment[]>([]);

  // Build query parameters
  const queryParams = {
    page: currentPage,
    limit: itemsPerPage,
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
    ...(severityFilter !== 'ALL' && { severity: severityFilter }),
    ...(startDate && { startDate: new Date(startDate).toISOString() }),
    ...(endDate && { endDate: new Date(endDate).toISOString() }),
    ...(protocolId && { protocolId }),
  };

  // Fetch payments using TanStack Query
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['payments', queryParams],
    queryFn: () => fetchPayments(queryParams),
    staleTime: 30 * 1000, // 30 seconds
  });

  // Update local payments when data changes
  useEffect(() => {
    if (data?.payments) {
      setLocalPayments(data.payments);
    }
  }, [data]);

  /**
   * Subscribe to payment:released WebSocket event
   */
  useEffect(() => {
    const unsubscribeReleased = subscribe('payment:released', (eventData: unknown) => {
      const newPayment = eventData as Payment;

      // Check if payment matches current filters
      const matchesProtocol = !protocolId || newPayment.protocol?.id === protocolId;
      const matchesStatus = statusFilter === 'ALL' || newPayment.status === statusFilter;
      const matchesSeverity = severityFilter === 'ALL' || newPayment.vulnerability?.severity === severityFilter;

      if (matchesProtocol && matchesStatus && matchesSeverity) {
        // Prepend new payment to table
        setLocalPayments((prev) => [newPayment, ...prev.slice(0, itemsPerPage - 1)]);
        // Refetch to update pagination metadata
        refetch();
      }
    });

    return unsubscribeReleased;
  }, [subscribe, protocolId, statusFilter, severityFilter, itemsPerPage, refetch]);

  /**
   * Subscribe to payment:failed WebSocket event
   */
  useEffect(() => {
    const unsubscribeFailed = subscribe('payment:failed', (eventData: unknown) => {
      const failedPayment = eventData as { paymentId: string; failureReason: string };

      // Update payment status in local state
      setLocalPayments((prev) =>
        prev.map((payment) =>
          payment.id === failedPayment.paymentId
            ? { ...payment, status: 'FAILED' as PaymentStatus, failureReason: failedPayment.failureReason }
            : payment
        )
      );
    });

    return unsubscribeFailed;
  }, [subscribe]);

  /**
   * Handle filter changes
   */
  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value as PaymentStatus | 'ALL');
    setCurrentPage(1); // Reset to first page
  }, []);

  const handleSeverityChange = useCallback((value: string) => {
    setSeverityFilter(value as SeverityLevel | 'ALL');
    setCurrentPage(1); // Reset to first page
  }, []);

  const handleStartDateChange = useCallback((value: string) => {
    setStartDate(value);
    setCurrentPage(1); // Reset to first page
  }, []);

  const handleEndDateChange = useCallback((value: string) => {
    setEndDate(value);
    setCurrentPage(1); // Reset to first page
  }, []);

  /**
   * Handle pagination changes
   */
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((value: string) => {
    setItemsPerPage(parseInt(value, 10));
    setCurrentPage(1); // Reset to first page
  }, []);

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (data?.pagination.hasNext) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [data?.pagination.hasNext]);

  /**
   * Calculate showing range
   */
  const getShowingRange = useCallback((): string => {
    if (!data?.pagination) return 'Showing 0 payments';

    const { totalCount, currentPage: page } = data.pagination;
    const start = (page - 1) * itemsPerPage + 1;
    const end = Math.min(page * itemsPerPage, totalCount);

    return `Showing ${start}-${end} of ${totalCount} payments`;
  }, [data?.pagination, itemsPerPage]);

  /**
   * Render loading state (skeleton loader)
   */
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
        </div>

        {/* Skeleton Loader */}
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (isError) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Error Loading Payments</h3>
            <p className="mt-1 text-sm text-red-700">
              {error instanceof Error ? error.message : 'Failed to fetch payment history'}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Render empty state
   */
  if (!data || localPayments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label htmlFor="status-filter" className="block text-xs font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div>
              <label htmlFor="severity-filter" className="block text-xs font-medium text-gray-700 mb-1">
                Severity
              </label>
              <select
                id="severity-filter"
                value={severityFilter}
                onChange={(e) => handleSeverityChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label htmlFor="start-date" className="block text-xs font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="end-date" className="block text-xs font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg
            className="w-12 h-12 text-gray-300 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-sm text-gray-600">No payments found</p>
          <p className="text-xs text-gray-500 mt-1">
            Payments will appear here once bounties are released.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label htmlFor="severity-filter" className="block text-xs font-medium text-gray-700 mb-1">
              Severity
            </label>
            <select
              id="severity-filter"
              value={severityFilter}
              onChange={(e) => handleSeverityChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label htmlFor="start-date" className="block text-xs font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="end-date" className="block text-xs font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Payment Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Protocol</th>
              <th className="px-6 py-3">Researcher Address</th>
              <th className="px-6 py-3">Severity</th>
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-center">Transaction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {localPayments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                {/* Date */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {formatDate(payment.createdAt)}
                  </span>
                </td>

                {/* Protocol */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {payment.protocol?.name || payment.protocol?.id || 'N/A'}
                  </span>
                </td>

                {/* Researcher Address */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className="text-sm font-mono text-gray-900"
                    title={payment.researcherAddress}
                  >
                    {truncateAddress(payment.researcherAddress)}
                  </span>
                </td>

                {/* Severity */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {payment.vulnerability?.severity ? (
                    <SeverityBadge severity={payment.vulnerability.severity} />
                  ) : (
                    <span className="text-sm text-gray-500">N/A</span>
                  )}
                </td>

                {/* Amount */}
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatAmount(payment.amount)} USDC
                  </span>
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusIndicator status={payment.status} />
                </td>

                {/* Transaction Link */}
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {payment.txHash ? (
                    <a
                      href={getBasescanUrl(payment.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                      title="View on Basescan"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t bg-gray-50">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
          {/* Total count */}
          <div className="text-sm text-gray-700">
            {getShowingRange()}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center space-x-4">
            {/* Items per page selector */}
            <div className="flex items-center space-x-2">
              <label htmlFor="items-per-page" className="text-sm text-gray-700">
                Per page:
              </label>
              <select
                id="items-per-page"
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>

            {/* Page navigation */}
            <div className="flex items-center space-x-2">
              {/* Previous button */}
              <button
                onClick={handlePreviousPage}
                disabled={!data?.pagination.hasPrevious}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  data?.pagination.hasPrevious
                    ? 'text-gray-700 hover:bg-gray-200'
                    : 'text-gray-300 cursor-not-allowed'
                )}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Page number display */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Page</span>
                <input
                  type="number"
                  min="1"
                  max={data?.pagination.totalPages || 1}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value, 10);
                    if (page >= 1 && page <= (data?.pagination.totalPages || 1)) {
                      handlePageChange(page);
                    }
                  }}
                  className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  of {data?.pagination.totalPages || 1}
                </span>
              </div>

              {/* Next button */}
              <button
                onClick={handleNextPage}
                disabled={!data?.pagination.hasNext}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  data?.pagination.hasNext
                    ? 'text-gray-700 hover:bg-gray-200'
                    : 'text-gray-300 cursor-not-allowed'
                )}
                aria-label="Next page"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
