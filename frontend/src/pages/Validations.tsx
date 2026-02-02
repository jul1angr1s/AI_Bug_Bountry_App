import { useState } from 'react';
import { useValidations } from '../hooks/useValidations';
import ValidationCard from '../components/validations/ValidationCard';
import { LoadingSkeleton } from '../components/shared/LoadingSkeleton';

export default function Validations() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data, isLoading, error } = useValidations({ status: statusFilter });

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Validations</h2>
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
            Validations
          </h1>
          <p className="text-gray-600 mt-2">
            Proof validation results powered by Kimi 2.5 LLM
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
            <option value="VALIDATED">Validated</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Validations List */}
        {isLoading ? (
          <LoadingSkeleton count={5} height={120} />
        ) : (
          <div className="space-y-4">
            {data?.validations && data.validations.length > 0 ? (
              data.validations.map((validation: any) => (
                <ValidationCard key={validation.id} validation={validation} />
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500">No validations found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
