import type { ElementType } from 'react';
import type { X402PaymentEvent } from '../../types/dashboard';
import { CheckCircle, Clock, XCircle, MinusCircle, ExternalLink } from 'lucide-react';
import {
  getExplorerTxUrl,
  isValidTxHash,
  truncateHash,
  formatUSDC,
  X402_DESCRIPTIONS,
  PAYMENT_STATUS_LABELS,
} from '../../lib/utils';

interface X402PaymentCardProps {
  payment: X402PaymentEvent;
}

const statusConfig: Record<
  X402PaymentEvent['status'],
  { icon: ElementType; color: string; bg: string }
> = {
  COMPLETED: {
    icon: CheckCircle,
    color: 'text-green-400',
    bg: 'bg-green-900/30',
  },
  PENDING: {
    icon: Clock,
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/30',
  },
  FAILED: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-900/30',
  },
  EXPIRED: {
    icon: MinusCircle,
    color: 'text-gray-400',
    bg: 'bg-gray-700/30',
  },
};

export default function X402PaymentCard({ payment }: X402PaymentCardProps) {
  const config = statusConfig[payment.status];
  const StatusIcon = config.icon;
  const statusLabel = PAYMENT_STATUS_LABELS[payment.status];
  const typeDesc = X402_DESCRIPTIONS[payment.requestType];

  return (
    <div className={`rounded-lg border border-gray-700 bg-gray-800 p-4 ${config.bg}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <StatusIcon className={`h-6 w-6 ${config.color}`} />
          <div>
            <p className="text-sm font-medium text-white">{formatUSDC(payment.amount)}</p>
            <p className="text-xs text-gray-400">{typeDesc?.label || payment.requestType}</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
        >
          {statusLabel?.label || payment.status}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-xs text-gray-400">
        <div className="flex justify-between">
          <span>Requester</span>
          <span className="font-mono text-gray-300">{truncateHash(payment.requesterAddress)}</span>
        </div>
        <div className="flex justify-between">
          <span>Date</span>
          <span className="text-gray-300">
            {new Date(payment.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Verification</span>
          {payment.txHash && isValidTxHash(payment.txHash) ? (
            <a
              href={getExplorerTxUrl(payment.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-blue-400 hover:text-blue-300 transition-colors"
            >
              Verify on chain
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-gray-500">Pending</span>
          )}
        </div>
      </div>
    </div>
  );
}
