import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PaymentHistory, EarningsLeaderboard, BountyPoolStatus } from '@/components/Payment';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Payment Dashboard Page
 *
 * Displays comprehensive payment information including:
 * - Bounty pool status and balance
 * - Payment history with filtering
 * - Top researcher earnings leaderboard
 *
 * Requirements from OpenSpec tasks 18.1-18.5
 * Reference: openspec/changes/phase-4-payment-automation/specs/payment-dashboard/spec.md
 */
export default function PaymentDashboard() {
  const { id: protocolId } = useParams<{ id: string }>();

  if (!protocolId) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900">Protocol not selected</h2>
          <p className="text-sm text-gray-600 mt-2">
            Please navigate from a protocol to view its payment dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Set page title and meta description for SEO
  useEffect(() => {
    document.title = 'Payment Dashboard | Openspect';

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'View payment history, researcher earnings, and bounty pool status');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'View payment history, researcher earnings, and bounty pool status';
      document.head.appendChild(meta);
    }

    // Cleanup: restore original title on unmount
    return () => {
      document.title = 'Thunder Security - Dashboard';
    };
  }, []);

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-gray-400" aria-label="Breadcrumb">
        <a
          href="/"
          className="flex items-center hover:text-white transition-colors"
          aria-label="Home"
        >
          <Home className="w-4 h-4" />
        </a>
        <ChevronRight className="w-4 h-4" />
        <span className="text-white">Payments</span>
      </nav>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Payment Dashboard</h1>
        <p className="text-gray-400">
          Monitor payment history, researcher earnings, and bounty pool status
        </p>
      </div>

      {/* Bounty Pool Status - Full Width */}
      <section aria-label="Bounty Pool Status">
        <BountyPoolStatus protocolId={protocolId} />
      </section>

      {/* Payment History & Earnings Leaderboard - Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment History - Wider column (2/3 width on desktop) */}
        <section className="lg:col-span-2" aria-label="Payment History">
          <PaymentHistory protocolId={protocolId} />
        </section>

        {/* Earnings Leaderboard - Narrower column (1/3 width on desktop) */}
        <section className="lg:col-span-1" aria-label="Earnings Leaderboard">
          <EarningsLeaderboard />
        </section>
      </div>
    </div>
  );
}
