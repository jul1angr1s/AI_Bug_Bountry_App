import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Filter } from 'lucide-react';
import { useValidations } from '../hooks/useValidations';
import { useValidationActivity } from '../hooks/useValidationActivity';
import ValidationCard from '../components/validations/ValidationCard';
import ValidationDetailModal from '../components/validations/ValidationDetailModal';
import { ActiveValidationPanel } from '../components/validations/ActiveValidationPanel';
import { LoadingSkeleton } from '../components/shared/LoadingSkeleton';
import ContractBadge from '../components/shared/ContractBadge';
import { getContractByName } from '../lib/contracts';
import { api } from '../lib/api';

export default function Validations() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const { data, isLoading, error } = useValidations({ status: statusFilter });
  const queryClient = useQueryClient();

  // Primary: SSE-based instant detection
  const { activeValidationId: sseValidationId, state: sseState } = useValidationActivity();

  // Fallback: polling (reduced frequency since SSE is primary)
  const { data: activeData } = useQuery({
    queryKey: ['validations', 'active'],
    queryFn: async () => {
      const response = await api.get('/validations/active');
      return response.data;
    },
    refetchInterval: 10000,
  });

  const pollingValidationId = activeData?.activeValidation?.id as string | undefined;

  // Merge SSE + polling: SSE takes priority
  const activeValidationId = sseValidationId || pollingValidationId || null;

  // Delayed panel hiding: keep panel visible for 5s after completion
  const [displayedValidationId, setDisplayedValidationId] = useState<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeValidationId) {
      // Validation is active — show panel immediately, cancel any pending hide
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setDisplayedValidationId(activeValidationId);
    } else if (displayedValidationId) {
      // Validation just ended — delay hiding by 5 seconds
      hideTimerRef.current = setTimeout(() => {
        setDisplayedValidationId(null);
        hideTimerRef.current = null;
        // Refetch validations list so card statuses update
        queryClient.invalidateQueries({ queryKey: ['validations'] });
      }, 5000);
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [activeValidationId, displayedValidationId, queryClient]);

  // Also refetch when SSE reports completion
  useEffect(() => {
    if (sseState === 'COMPLETED' || sseState === 'FAILED') {
      queryClient.invalidateQueries({ queryKey: ['validations'] });
    }
  }, [sseState, queryClient]);

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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Validations
            </h1>
            {getContractByName('ValidationRegistry') && (
              <ContractBadge variant="inline" contract={getContractByName('ValidationRegistry')!} />
            )}
          </div>
          <p className="text-gray-600 mt-2">
            Proof validation results powered by Kimi 2.5 LLM
          </p>
        </div>

        {/* Active Validation Panel */}
        {displayedValidationId && (
          <ActiveValidationPanel validationId={displayedValidationId} />
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-gray-500">
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filter:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="VALIDATING">Validating</option>
              <option value="VALIDATED">Validated</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Validations List */}
        {isLoading ? (
          <LoadingSkeleton count={5} variant="card" />
        ) : (
          <div className="space-y-4">
            {data?.validations && data.validations.length > 0 ? (
              data.validations.map((validation: any) => (
                <ValidationCard
                  key={validation.id}
                  validation={validation}
                  onClick={() => setSelectedFindingId(validation.findingId)}
                />
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500">No validations found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedFindingId && (
        <ValidationDetailModal
          findingId={selectedFindingId}
          onClose={() => setSelectedFindingId(null)}
        />
      )}
    </div>
  );
}
