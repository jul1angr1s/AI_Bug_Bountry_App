import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useAgentIdentity } from '../hooks/useAgentIdentities';
import { useEscrowBalance, useEscrowTransactions } from '../hooks/useEscrow';
import { EscrowBalanceCard } from '../components/agents/EscrowBalanceCard';
import { EscrowTransactionList } from '../components/agents/EscrowTransactionList';
import { EscrowDepositFlow } from '../components/agents/EscrowDepositFlow';
import ContractBadge from '../components/shared/ContractBadge';
import { getContractByName } from '../lib/contracts';

export default function EscrowDashboard() {
  const { id } = useParams<{ id: string }>();
  const [showDeposit, setShowDeposit] = useState(false);
  const { data: agent } = useAgentIdentity(id);
  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useEscrowBalance(id);
  const { data: transactions, isLoading: txLoading, refetch: refetchTx } = useEscrowTransactions(id);

  const handleDepositSuccess = () => {
    setShowDeposit(false);
    refetchBalance();
    refetchTx();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="w-6 h-6 text-green-400" />
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Escrow Dashboard</h1>
            {getContractByName('PlatformEscrow') && (
              <ContractBadge variant="inline" contract={getContractByName('PlatformEscrow')!} />
            )}
          </div>
          {agent && (
            <p className="text-sm text-gray-400">
              {agent.walletAddress.slice(0, 6)}...{agent.walletAddress.slice(-4)} &middot; {agent.agentType}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <EscrowBalanceCard
            balance={balance}
            isLoading={balanceLoading}
            onDeposit={() => setShowDeposit(true)}
          />
        </div>
        <div className="lg:col-span-2">
          {showDeposit && id ? (
            <EscrowDepositFlow
              agentId={id}
              onSuccess={handleDepositSuccess}
              onClose={() => setShowDeposit(false)}
            />
          ) : (
            <EscrowTransactionList transactions={transactions || []} isLoading={txLoading} />
          )}
        </div>
      </div>
    </div>
  );
}
