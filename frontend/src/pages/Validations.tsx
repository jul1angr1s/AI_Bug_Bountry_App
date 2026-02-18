import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Filter, ShieldCheck } from 'lucide-react';
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

  const { activeValidationId: sseValidationId, state: sseState } = useValidationActivity();

  const { data: activeData } = useQuery({
    queryKey: ['validations', 'active'],
    queryFn: async () => {
      const response = await api.get('/validations/active');
      return response.data;
    },
    refetchInterval: 10000,
  });

  const pollingValidationId = activeData?.activeValidation?.id as string | undefined;
  const activeValidationId = sseValidationId || pollingValidationId || null;

  const [displayedValidationId, setDisplayedValidationId] = useState<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeValidationId) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setDisplayedValidationId(activeValidationId);
    } else if (displayedValidationId) {
      hideTimerRef.current = setTimeout(() => {
        setDisplayedValidationId(null);
        hideTimerRef.current = null;
        queryClient.invalidateQueries({ queryKey: ['validations'] });
      }, 5000);
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [activeValidationId, displayedValidationId, queryClient]);

  useEffect(() => {
    if (sseState === 'COMPLETED' || sseState === 'FAILED') {
      queryClient.invalidateQueries({ queryKey: ['validations'] });
    }
  }, [sseState, queryClient]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1419] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-2">Error Loading Validations</h2>
            <p className="text-gray-400">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-blue-400" />
            <h1 className="text-3xl font-bold text-white font-heading">Validations</h1>
            {getContractByName('ValidationRegistry') && (
              <ContractBadge variant="inline" contract={getContractByName('ValidationRegistry')!} />
            )}
          </div>
          <p className="text-gray-400 mt-2">
            Proof validation results powered by Kimi 2.5 LLM
          </p>
        </div>

        {displayedValidationId && (
          <ActiveValidationPanel validationId={displayedValidationId} />
        )}

        <div className="mb-6 flex gap-4 rounded-xl border border-navy-700 bg-navy-800/70 p-4">
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
              <option value="PENDING">Pending</option>
              <option value="VALIDATING">Validating</option>
              <option value="VALIDATED">Validated</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

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
              <div className="text-center py-12 bg-[#162030] border border-[#2f466a] rounded-xl">
                <p className="text-gray-400">No validations found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedFindingId && (
        <ValidationDetailModal
          findingId={selectedFindingId}
          onClose={() => setSelectedFindingId(null)}
        />
      )}
    </div>
  );
}
