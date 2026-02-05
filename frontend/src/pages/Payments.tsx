import { useState } from 'react';
import { usePayments } from '../hooks/usePayments';
import { usePaymentStats } from '../hooks/usePaymentStats';
import { usePaymentLeaderboard } from '../hooks/usePaymentLeaderboard';
import { PaymentStatsCards } from '../components/payments/PaymentStatsCards';
import { PayoutChart } from '../components/payments/PayoutChart';
import { RecentPaymentsTable } from '../components/payments/RecentPaymentsTable';
import { TopEarnersLeaderboard } from '../components/payments/TopEarnersLeaderboard';
import { ProposePaymentModal, PaymentProposal } from '../components/payments/ProposePaymentModal';
import { api } from '../lib/api';

export default function Payments() {
  const [modalOpen, setModalOpen] = useState(false);

  const { data: statsData, isLoading: statsLoading } = usePaymentStats();
  const { data: leaderboardData, isLoading: leaderboardLoading } = usePaymentLeaderboard({ limit: 10 });
  const { data: paymentsData, isLoading: paymentsLoading } = usePayments({ 
    status: 'COMPLETED'
  });

  const handleProposePayment = async (proposal: PaymentProposal) => {
    try {
      await api.post('/payments/propose', proposal);
      // Show success toast (you may want to add a toast library)
      alert('Payment proposal submitted successfully!');
    } catch (error: any) {
      console.error('Error proposing payment:', error);
      alert(`Error: ${error.response?.data?.error?.message || 'Failed to submit proposal'}`);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="w-full px-6 py-8 md:px-10">
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              USDC Payments & Rewards
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-base max-w-2xl">
              Manage automated payouts and view metrics. Real-time settlement on Base Sepolia.
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

      {/* Stats Cards */}
      <PaymentStatsCards 
        stats={statsData} 
        poolBalance={50}
        isLoading={statsLoading}
      />

      {/* Main Content */}
      <div className="flex-1 px-6 md:px-10 pb-10">
        <div className="flex flex-col lg:flex-row gap-6 h-full">
          {/* Left Column: Chart + Table */}
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

          {/* Right Column: Leaderboard */}
          <div className="lg:w-96 flex-shrink-0">
            <TopEarnersLeaderboard
              leaderboard={leaderboardData || []}
              isLoading={leaderboardLoading}
              maxVisible={5}
            />
          </div>
        </div>
      </div>

      {/* Propose Payment Modal */}
      <ProposePaymentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleProposePayment}
      />
    </div>
  );
}
