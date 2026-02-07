import type { X402PaymentEvent } from '../../types/dashboard';
import { Shield, Search, ExternalLink } from 'lucide-react';

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

function formatUSDC(amount: string): string {
  const value = Number(amount) / 1e6;
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDC`;
}

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RequestTypeCell({ type }: { type: X402PaymentEvent['requestType'] }) {
  if (type === 'PROTOCOL_REGISTRATION') {
    return (
      <span className="inline-flex items-center gap-1.5 text-gray-300">
        <Shield className="h-4 w-4 text-blue-400" />
        Protocol Registration
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-gray-300">
      <Search className="h-4 w-4 text-purple-400" />
      Finding Submission
    </span>
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
            {['Type', 'Requester', 'Amount', 'Status', 'TX', 'Date'].map((h) => (
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
              return (
                <tr key={p.id} className="hover:bg-gray-750 transition-colors">
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <RequestTypeCell type={p.requestType} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-300">
                    {truncateAddress(p.requesterAddress)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-white">
                    {formatUSDC(p.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {p.txHash ? (
                      <a
                        href={`https://sepolia.basescan.org/tx/${p.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {truncateAddress(p.txHash)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-gray-500">-</span>
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
