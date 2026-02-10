import { useState, useEffect } from 'react';
import { MaterialIcon } from '../shared/MaterialIcon';
import { GradientButton } from '../shared/GradientButton';
import { fetchAgentsByType } from '../../lib/api';
import type { AgentIdentity } from '../../types/dashboard';

interface AgentSelectionStepProps {
  onComplete: (researcherAgentId: string, validatorAgentId: string) => void;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function AgentSelectionStep({ onComplete }: AgentSelectionStepProps) {
  const [researchers, setResearchers] = useState<AgentIdentity[]>([]);
  const [validators, setValidators] = useState<AgentIdentity[]>([]);
  const [selectedResearcher, setSelectedResearcher] = useState('');
  const [selectedValidator, setSelectedValidator] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAgents() {
      try {
        setLoading(true);
        const [researcherList, validatorList] = await Promise.all([
          fetchAgentsByType('RESEARCHER'),
          fetchAgentsByType('VALIDATOR'),
        ]);
        setResearchers(researcherList);
        setValidators(validatorList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agents');
      } finally {
        setLoading(false);
      }
    }
    loadAgents();
  }, []);

  const canContinue = selectedResearcher && selectedValidator;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" />
        <span className="ml-3 text-gray-400">Loading available agents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-xl">
        <div className="flex gap-3 items-center">
          <MaterialIcon name="error" className="text-2xl text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <MaterialIcon name="group" className="text-2xl text-cyan-400" />
        <h2 className="text-2xl font-bold text-white font-['Space_Grotesk']">Select Agents</h2>
      </div>
      <p className="text-gray-400 text-sm">
        Choose a researcher agent to scan your protocol and a validator agent to verify findings.
      </p>

      {/* Researcher Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <MaterialIcon name="search" className="text-base text-purple-400 mr-1 align-middle" />
          Researcher Agent
        </label>
        <select
          value={selectedResearcher}
          onChange={(e) => setSelectedResearcher(e.target.value)}
          className="w-full bg-[#1a2535] border border-[#2f466a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
        >
          <option value="">Select a researcher agent...</option>
          {researchers.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {truncateAddress(agent.walletAddress)} — Score: {agent.reputation?.reputationScore ?? 0} — {agent.isActive ? 'Active' : 'Inactive'}
            </option>
          ))}
        </select>
        {researchers.length === 0 && (
          <p className="text-yellow-400 text-xs mt-1">No researcher agents available. Register one first.</p>
        )}
      </div>

      {/* Validator Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <MaterialIcon name="verified" className="text-base text-emerald-400 mr-1 align-middle" />
          Validator Agent
        </label>
        <select
          value={selectedValidator}
          onChange={(e) => setSelectedValidator(e.target.value)}
          className="w-full bg-[#1a2535] border border-[#2f466a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
        >
          <option value="">Select a validator agent...</option>
          {validators.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {truncateAddress(agent.walletAddress)} — Score: {agent.reputation?.reputationScore ?? 0} — {agent.isActive ? 'Active' : 'Inactive'}
            </option>
          ))}
        </select>
        {validators.length === 0 && (
          <p className="text-yellow-400 text-xs mt-1">No validator agents available. Register one first.</p>
        )}
      </div>

      {/* Selected agents summary */}
      {canContinue && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <MaterialIcon name="check_circle" className="text-lg text-green-400" />
            <span className="text-green-400 font-medium text-sm">Agents selected</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Researcher:</span>{' '}
              <span className="text-white">
                {truncateAddress(researchers.find((a) => a.id === selectedResearcher)?.walletAddress || '')}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Validator:</span>{' '}
              <span className="text-white">
                {truncateAddress(validators.find((a) => a.id === selectedValidator)?.walletAddress || '')}
              </span>
            </div>
          </div>
        </div>
      )}

      <GradientButton
        variant="primary"
        onClick={() => onComplete(selectedResearcher, selectedValidator)}
        disabled={!canContinue}
        className="w-full py-3"
      >
        <span className="flex items-center justify-center gap-2">
          <MaterialIcon name="arrow_forward" className="text-base" />
          Continue to Protocol Details
        </span>
      </GradientButton>
    </div>
  );
}
