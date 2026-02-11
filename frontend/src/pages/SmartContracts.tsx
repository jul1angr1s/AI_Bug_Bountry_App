import { Shield } from 'lucide-react';
import { getAllContracts } from '../lib/contracts';
import ContractBadge from '../components/shared/ContractBadge';

export default function SmartContracts() {
  const contracts = getAllContracts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Smart Contracts</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              On-chain contracts deployed on Base Sepolia backing every platform feature
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Base Sepolia
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {contracts.map((contract) => (
          <ContractBadge key={contract.name} variant="card" contract={contract} />
        ))}
      </div>
    </div>
  );
}
