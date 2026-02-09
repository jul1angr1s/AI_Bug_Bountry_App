import { useState } from 'react';
import { depositEscrow } from '../../lib/api';

interface EscrowDepositFlowProps {
  agentId: string;
  onSuccess: () => void;
  onClose: () => void;
}

const PLATFORM_ESCROW_ADDRESS = '0x1EC275172C191670C9fbB290dcAB31A9784BC6eC';

export function EscrowDepositFlow({ agentId, onSuccess, onClose }: EscrowDepositFlowProps) {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidAmount = (): boolean => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return false;
    // Check max 6 decimal places
    const parts = amount.split('.');
    if (parts.length === 2 && parts[1].length > 6) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidAmount()) {
      setError('Please enter a valid positive amount (max 6 decimal places).');
      return;
    }

    setIsLoading(true);
    try {
      // Convert human-readable USDC amount to BigInt string (6 decimals)
      const usdcAmount = Math.round(parseFloat(amount) * 1_000_000).toString();
      await depositEscrow(agentId, usdcAmount);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deposit failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Deposit USDC to Escrow</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          Cancel
        </button>
      </div>

      <div className="mb-4 p-3 bg-gray-900 rounded-lg">
        <p className="text-xs text-gray-400 mb-1">PlatformEscrow Contract</p>
        <p className="text-sm text-gray-300 font-mono break-all">
          {PLATFORM_ESCROW_ADDRESS}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="deposit-amount" className="block text-sm font-medium text-gray-300 mb-2">
            Amount (USDC)
          </label>
          <input
            id="deposit-amount"
            type="number"
            step="0.000001"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null);
            }}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-md">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !amount}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Depositing...
            </>
          ) : (
            'Deposit'
          )}
        </button>
      </form>
    </div>
  );
}

export default EscrowDepositFlow;
