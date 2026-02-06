import type { ElementType } from 'react';
import type { X402PaymentEvent } from '../../types/dashboard';
import { CheckCircle, Clock, XCircle, MinusCircle, ExternalLink } from 'lucide-react';

interface X402PaymentCardProps {
  payment: X402PaymentEvent;
}

const statusConfig: Record<
  X402PaymentEvent['status'],
  { icon: ElementType; color: string; bg: string; label: string }
> = {
  COMPLETED: {
    icon: CheckCircle,
    color: 'text-green-400',
    bg: 'bg-green-900/30',
    label: 'Completed',
  },
  PENDING: {
    icon: Clock,
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/30',
    label: 'Pending',
  },
  FAILED: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-900/30',
    label: 'Failed',
  },
  EXPIRED: {
    icon: MinusCircle,
    color: 'text-gray-400',
    bg: 'bg-gray-700/30',
    label: 'Expired',
  },
};

const requestTypeLabels: Record<X402PaymentEvent['requestType'], string> = {
  PROTOCOL_REGISTRATION: 'Protocol Registration',
  FINDING_SUBMISSION: 'Finding Submission',
};

function formatUSDC(amount: string): string {
  const value = Number(amount) / 1e6;
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDC`;
}

function truncateHash(hash: string): string {
  if (hash.length <= 10) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

export default function X402PaymentCard({ payment }: X402PaymentCardProps) {
  const config = statusConfig[payment.status];
  const StatusIcon = config.icon;

  return (
    <div className={`rounded-lg border border-gray-700 bg-gray-800 p-4 ${config.bg}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <StatusIcon className={`h-6 w-6 ${config.color}`} />
          <div>
            <p className="text-sm font-medium text-white">{formatUSDC(payment.amount)}</p>
            <p className="text-xs text-gray-400">{requestTypeLabels[payment.requestType]}</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
        >
          {config.label}
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
          <span>TX Hash</span>
          {payment.txHash ? (
            <a
              href={`https://sepolia.basescan.org/tx/${payment.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-blue-400 hover:text-blue-300 transition-colors"
            >
              {truncateHash(payment.txHash)}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-gray-500">-</span>
          )}
        </div>
      </div>
    </div>
  );
}
