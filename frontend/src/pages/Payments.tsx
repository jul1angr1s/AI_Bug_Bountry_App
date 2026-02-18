import { useState } from 'react';
import { usePayments } from '../hooks/usePayments';
import { usePaymentStats } from '../hooks/usePaymentStats';
import { usePaymentLeaderboard } from '../hooks/usePaymentLeaderboard';
import { useStats } from '../hooks/useDashboardData';
import { PaymentStatsCards } from '../components/payments/PaymentStatsCards';
import { PayoutChart } from '../components/payments/PayoutChart';
import { RecentPaymentsTable } from '../components/payments/RecentPaymentsTable';
import { TopEarnersLeaderboard } from '../components/payments/TopEarnersLeaderboard';
import { ProposePaymentModal, PaymentProposal } from '../components/payments/ProposePaymentModal';
import { DollarSign } from 'lucide-react';
import ContractBadge from '../components/shared/ContractBadge';
import { getContractByName } from '../lib/contracts';
import { api } from '../lib/api';

export default function Payments() {
  const [modalOpen, setModalOpen] = useState(false);

  const { data: statsData, isLoading: statsLoading } = usePaymentStats();
  const { data: dashboardStats } = useStats();
  const { data: leaderboardData, isLoading: leaderboardLoading } = usePaymentLeaderboard({ limit: 10 });
  const { data: paymentsData, isLoading: paymentsLoading } = usePayments({});

  const handleProposePayment = async (proposal: PaymentProposal) => {
    try {
      const response = await api.post('/payments/propose', proposal);
      const proposalData = response.data?.data;

      if (proposalData) {
        alert(`Payment proposal submitted successfully!\n\nProposal ID: ${proposalData.id}\nAmount: ${proposalData.amount} USDC\nStatus: ${proposalData.status}`);
      } else {
        alert(`Error: ${response.data?.error?.message || 'Failed to submit proposal'}`);
        throw new Error(response.data?.error?.message);
      }
    } catch (error: any) {
      console.error('Error proposing payment:', error);
      const errorMessage = error.response?.data?.error?.message
        || error.message
        || 'Failed to submit proposal. Make sure the backend is running.';
      alert(`Error: ${errorMessage}`);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <DollarSign className="w-7 h-7 text-accent-gold" />
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white font-heading">
                  USDC Payments & Rewards
                </h1>
                {getContractByName('BountyPool') && (
                  <ContractBadge variant="inline" contract={getContractByName('BountyPool')!} />
                )}
              </div>
              <p className="text-gray-400 text-base max-w-2xl">
                Manage automated payouts and view metrics. Real-time settlement on Base Sepolia.
              </p>
              <p className="text-sm text-gray-500">
                {(paymentsData?.total || 0)} tracked payment{(paymentsData?.total || 0) === 1 ? '' : 's'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent-gold text-black hover:bg-yellow-400 transition-all shadow-lg shadow-glow-gold font-bold cursor-pointer select-none"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm">Propose Payment</span>
              </button>
            </div>
          </div>
        </header>

        <PaymentStatsCards
          stats={statsData}
          poolBalance={dashboardStats?.bountyPool?.total ?? 0}
          isLoading={statsLoading}
        />

        <div className="pb-10">
          <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="flex flex-col flex-[2] gap-6">
              <PayoutChart
                stats={statsData}
                isLoading={statsLoading}
              />
              <RecentPaymentsTable
                payments={paymentsData?.payments || []}
                isLoading={paymentsLoading}
              />
            </div>

            <div className="lg:w-96 flex-shrink-0">
              <TopEarnersLeaderboard
                leaderboard={leaderboardData || []}
                isLoading={leaderboardLoading}
                maxVisible={5}
              />
            </div>
          </div>
        </div>
      </div>

      <ProposePaymentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleProposePayment}
      />
    </div>
  );
}
