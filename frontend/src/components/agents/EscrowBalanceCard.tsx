import type { EscrowBalance } from '../../types/dashboard';
import { Wallet, ArrowDownCircle } from 'lucide-react';

interface EscrowBalanceCardProps {
  balance: EscrowBalance | undefined;
  isLoading: boolean;
  onDeposit: () => void;
}

function formatUsdc(amountStr: string): string {
  const value = Number(amountStr) / 1_000_000;
  return value.toFixed(2);
}

export function EscrowBalanceCard({ balance, isLoading, onDeposit }: EscrowBalanceCardProps) {
  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-40 bg-gray-700 rounded animate-pulse" />
          <div className="h-9 w-32 bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="mb-6">
          <div className="h-10 w-48 bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-36 bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-gray-700 rounded animate-pulse" />
          <div className="h-16 bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Wallet className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Escrow Balance</h3>
        </div>
        <button
          onClick={onDeposit}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <ArrowDownCircle className="h-4 w-4" />
          <span>Deposit</span>
        </button>
      </div>

      {/* Balance Display */}
      <div className="mb-6">
        <p className="text-3xl font-bold text-white">
          {balance ? formatUsdc(balance.balance) : '0.00'}{' '}
          <span className="text-lg font-normal text-gray-400">USDC</span>
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {balance ? balance.remainingSubmissions : 0} submissions remaining
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Total Deposited</p>
          <p className="text-sm font-semibold text-green-400">
            {balance ? formatUsdc(balance.totalDeposited) : '0.00'} USDC
          </p>
        </div>
        <div className="bg-gray-900 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Total Deducted</p>
          <p className="text-sm font-semibold text-red-400">
            {balance ? formatUsdc(balance.totalDeducted) : '0.00'} USDC
          </p>
        </div>
      </div>
    </div>
  );
}

export default EscrowBalanceCard;
