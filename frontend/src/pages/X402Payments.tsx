import { CreditCard } from 'lucide-react';
import { useX402Payments } from '../hooks/useX402Payments';
import X402PaymentTimeline from '../components/agents/X402PaymentTimeline';

export default function X402Payments() {
  const { data: payments, isLoading } = useX402Payments();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="w-6 h-6 text-purple-400" />
        <h1 className="text-2xl font-bold text-white">x.402 Payment Events</h1>
      </div>

      <X402PaymentTimeline payments={payments || []} isLoading={isLoading} />
    </div>
  );
}
