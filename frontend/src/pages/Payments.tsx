import { useState } from 'react';
import { usePayments } from '../hooks/usePayments';
import PaymentCard from '../components/payments/PaymentCard';
import { LoadingSkeleton } from '../components/shared/LoadingSkeleton';

export default function Payments() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data, isLoading, error } = usePayments({ status: statusFilter });

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Payments</h2>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Payments
          </h1>
          <p className="text-gray-600 mt-2">
            Bounty payments processed on Base Sepolia
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {/* Payments List */}
        {isLoading ? (
          <LoadingSkeleton count={5} height={120} />
        ) : (
          <div className="space-y-4">
            {data?.payments && data.payments.length > 0 ? (
              data.payments.map((payment: any) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500">No payments found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
