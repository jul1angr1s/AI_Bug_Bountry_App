import { ExternalLink, CheckCircle, Clock, XCircle } from 'lucide-react';
import { getExplorerTxUrl } from '../../lib/utils';

interface PaymentCardProps {
  payment: {
    id: string;
    protocolName: string;
    researcherAddress: string;
    amount: string;
    currency: string;
    status: string;
    txHash?: string;
    paidAt?: string;
  };
}

export default function PaymentCard({ payment }: PaymentCardProps) {
  const getStatusIcon = () => {
    switch (payment.status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'PROCESSING':
        return <Clock className="w-5 h-5 text-blue-400" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusColor = () => {
    switch (payment.status) {
      case 'COMPLETED':
        return 'bg-green-500/15 text-green-300 border border-green-500/30';
      case 'FAILED':
        return 'bg-red-500/15 text-red-300 border border-red-500/30';
      case 'PROCESSING':
        return 'bg-blue-500/15 text-blue-300 border border-blue-500/30';
      default:
        return 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30';
    }
  };

  const basescanUrl = payment.txHash
    ? getExplorerTxUrl(payment.txHash)
    : null;

  return (
    <div className="bg-navy-800 rounded-xl p-6 border border-navy-700 hover:border-primary/50 hover:shadow-glow-blue transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            {getStatusIcon()}
            <h3 className="font-semibold text-white truncate">{payment.protocolName}</h3>
          </div>

          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-300">Researcher:</span>
              <span className="font-mono text-xs text-gray-400">
                {payment.researcherAddress.slice(0, 10)}...{payment.researcherAddress.slice(-8)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-300">Amount:</span>
              <span className="font-bold text-lg text-accent-gold">${payment.amount} {payment.currency}</span>
            </div>

            {payment.txHash && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-300">TX:</span>
                <a
                  href={basescanUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:text-blue-300 font-mono text-xs"
                >
                  {payment.txHash.slice(0, 10)}...{payment.txHash.slice(-8)}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            {payment.paidAt && (
              <p className="text-gray-500">
                Paid {new Date(payment.paidAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {payment.status}
        </span>
      </div>
    </div>
  );
}
