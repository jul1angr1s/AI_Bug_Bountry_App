import type { X402PaymentEvent } from '../../types/dashboard';
import { Shield, Search, Zap, FileText, ExternalLink } from 'lucide-react';
import {
  getExplorerTxUrl,
  isValidTxHash,
  truncateHash,
  formatUSDC,
  formatDate,
  X402_DESCRIPTIONS,
  PAYMENT_STATUS_LABELS,
} from '../../lib/utils';

interface X402PaymentTimelineProps {
  payments: X402PaymentEvent[];
  isLoading: boolean;
}

const statusBadge: Record<X402PaymentEvent['status'], { bg: string; text: string }> = {
  PENDING: { bg: 'bg-yellow-900/50', text: 'text-yellow-300' },
  COMPLETED: { bg: 'bg-green-900/50', text: 'text-green-300' },
  EXPIRED: { bg: 'bg-gray-700', text: 'text-gray-400' },
  FAILED: { bg: 'bg-red-900/50', text: 'text-red-300' },
};

const REQUEST_TYPE_CONFIG: Record<string, { icon: typeof Shield; color: string; fallbackLabel: string }> = {
  PROTOCOL_REGISTRATION: { icon: Shield, color: 'text-blue-400', fallbackLabel: 'Protocol Registration' },
  SCAN_REQUEST_FEE: { icon: Search, color: 'text-cyan-400', fallbackLabel: 'Scan Request Fee' },
  EXPLOIT_SUBMISSION_FEE: { icon: Zap, color: 'text-orange-400', fallbackLabel: 'Exploit Submission Fee' },
  FINDING_SUBMISSION: { icon: FileText, color: 'text-purple-400', fallbackLabel: 'Finding Submission' },
};

function RequestTypeCell({ type }: { type: X402PaymentEvent['requestType'] }) {
  const desc = X402_DESCRIPTIONS[type];
  const config = REQUEST_TYPE_CONFIG[type] || REQUEST_TYPE_CONFIG.FINDING_SUBMISSION;
  const Icon = config.icon;

  return (
    <div>
      <span className="inline-flex items-center gap-1.5 text-gray-300">
        <Icon className={`h-4 w-4 ${config.color}`} />
        {desc?.label || config.fallbackLabel}
      </span>
      {desc?.description && (
        <p className="text-[11px] text-gray-500 mt-0.5">{desc.description}</p>
      )}
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-24 rounded bg-gray-700" />
        </td>
      ))}
    </tr>
  );
}

export default function X402PaymentTimeline({ payments, isLoading }: X402PaymentTimelineProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-800">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-900">
          <tr>
            {['Type', 'Requester', 'Amount', 'Status', 'Verification', 'Date'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {isLoading && (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          )}

          {!isLoading && payments.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                No x.402 payment events found.
              </td>
            </tr>
          )}

          {!isLoading &&
            payments.map((p) => {
              const badge = statusBadge[p.status];
              const statusLabel = PAYMENT_STATUS_LABELS[p.status];
              return (
                <tr key={p.id} className="hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3 text-sm">
                    <RequestTypeCell type={p.requestType} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-300">
                    {truncateHash(p.requesterAddress)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-white">
                    {formatUSDC(p.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
                      title={statusLabel?.description}
                    >
                      {statusLabel?.label || p.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {p.txHash && isValidTxHash(p.txHash) ? (
                      <a
                        href={getExplorerTxUrl(p.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Verify on chain
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-gray-500">Unavailable</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-400">
                    {formatDate(p.createdAt)}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
