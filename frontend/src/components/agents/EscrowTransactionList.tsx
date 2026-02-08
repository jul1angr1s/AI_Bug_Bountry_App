import type { EscrowTransaction } from '../../types/dashboard';
import { ArrowUpCircle, ArrowDownCircle, ExternalLink } from 'lucide-react';
import { getExplorerTxUrl } from '../../lib/utils';

interface EscrowTransactionListProps {
  transactions: EscrowTransaction[];
  isLoading: boolean;
}

function formatUsdc(amountStr: string): string {
  const value = Number(amountStr) / 1_000_000;
  return value.toFixed(2);
}

function getTransactionConfig(type: EscrowTransaction['transactionType']) {
  switch (type) {
    case 'DEPOSIT':
      return {
        icon: <ArrowDownCircle className="h-4 w-4 text-green-400" />,
        label: 'Deposit',
        color: 'text-green-400',
      };
    case 'SUBMISSION_FEE':
      return {
        icon: <ArrowUpCircle className="h-4 w-4 text-red-400" />,
        label: 'Submission Fee',
        color: 'text-red-400',
      };
    case 'WITHDRAWAL':
      return {
        icon: <ArrowUpCircle className="h-4 w-4 text-orange-400" />,
        label: 'Withdrawal',
        color: 'text-orange-400',
      };
    case 'PROTOCOL_FEE':
      return {
        icon: <ArrowUpCircle className="h-4 w-4 text-blue-400" />,
        label: 'Protocol Fee',
        color: 'text-blue-400',
      };
  }
}

function getReference(tx: EscrowTransaction): string | null {
  if (tx.transactionType === 'SUBMISSION_FEE' && tx.findingId) {
    return `Finding: ${tx.findingId.slice(0, 8)}...`;
  }
  if (tx.transactionType === 'PROTOCOL_FEE' && tx.protocolId) {
    return `Protocol: ${tx.protocolId.slice(0, 8)}...`;
  }
  return null;
}

export function EscrowTransactionList({ transactions, isLoading }: EscrowTransactionListProps) {
  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="h-6 w-48 bg-gray-700 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Transaction History</h3>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No transactions yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  TX
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {transactions.map((tx) => {
                const config = getTransactionConfig(tx.transactionType);
                const reference = getReference(tx);

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-gray-900/50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        {config.icon}
                        <span className={`text-sm font-medium ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-white">
                        {formatUsdc(tx.amount)} USDC
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {reference ? (
                        <span className="text-sm text-gray-300 font-mono">
                          {reference}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-300">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {tx.txHash ? (
                        <a
                          href={getExplorerTxUrl(tx.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <span>Verify on chain</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default EscrowTransactionList;
