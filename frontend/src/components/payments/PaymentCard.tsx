import { ExternalLink, CheckCircle, Clock, XCircle } from 'lucide-react';

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
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (payment.status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const basescanUrl = payment.txHash
    ? `https://sepolia.basescan.org/tx/${payment.txHash}`
    : null;

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {getStatusIcon()}
            <h3 className="font-semibold text-gray-900">{payment.protocolName}</h3>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">Researcher:</span>
              <span className="font-mono text-xs">{payment.researcherAddress.slice(0, 10)}...{payment.researcherAddress.slice(-8)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium">Amount:</span>
              <span className="font-bold text-lg text-green-600">${payment.amount} {payment.currency}</span>
            </div>

            {payment.txHash && (
              <div className="flex items-center gap-2">
                <span className="font-medium">TX:</span>
                <a
                  href={basescanUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-purple-600 hover:text-purple-700 font-mono text-xs"
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
