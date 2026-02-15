import { useState, useEffect } from 'react';
import { X, UserPlus, Shield } from 'lucide-react';

interface RegisterAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { walletAddress: string; agentType: 'RESEARCHER' | 'VALIDATOR'; registerOnChain?: boolean }) => Promise<void>;
}

export function RegisterAgentModal({ isOpen, onClose, onSubmit }: RegisterAgentModalProps) {
  const [walletAddress, setWalletAddress] = useState('');
  const [agentType, setAgentType] = useState<'RESEARCHER' | 'VALIDATOR'>('RESEARCHER');
  const [registerOnChain, setRegisterOnChain] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setWalletAddress('');
      setAgentType('RESEARCHER');
      setRegisterOnChain(true);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    if (!walletAddress.trim()) {
      setError('Wallet address is required');
      return false;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      setError('Invalid Ethereum address. Must start with 0x followed by 40 hex characters.');
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({ walletAddress, agentType, registerOnChain });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register agent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-gray-900 w-full max-w-md rounded-2xl border border-gray-700 shadow-2xl relative overflow-hidden">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-60"></div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer z-10 p-2 hover:bg-white/5 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/10 rounded-full text-blue-400 border border-blue-500/20">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Register Agent</h3>
              <p className="text-gray-400 text-sm">Add a new ERC-8004 agent identity</p>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Wallet Address */}
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase font-semibold text-gray-400 tracking-wider">
                Wallet Address
              </label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => {
                  setWalletAddress(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-600 font-mono text-sm"
                placeholder="0x..."
              />
              <p className="text-gray-500 text-xs">
                The Ethereum address for this agent (0x + 40 hex characters)
              </p>
            </div>

            {/* Agent Type */}
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase font-semibold text-gray-400 tracking-wider">
                Agent Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                    agentType === 'RESEARCHER'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="agentType"
                    value="RESEARCHER"
                    checked={agentType === 'RESEARCHER'}
                    onChange={() => setAgentType('RESEARCHER')}
                    className="sr-only"
                  />
                  <div
                    className={`size-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      agentType === 'RESEARCHER' ? 'border-blue-500' : 'border-gray-600'
                    }`}
                  >
                    {agentType === 'RESEARCHER' && (
                      <div className="size-2 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Researcher</p>
                    <p className="text-xs text-gray-500">Finds vulnerabilities</p>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                    agentType === 'VALIDATOR'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="agentType"
                    value="VALIDATOR"
                    checked={agentType === 'VALIDATOR'}
                    onChange={() => setAgentType('VALIDATOR')}
                    className="sr-only"
                  />
                  <div
                    className={`size-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      agentType === 'VALIDATOR' ? 'border-purple-500' : 'border-gray-600'
                    }`}
                  >
                    {agentType === 'VALIDATOR' && (
                      <div className="size-2 rounded-full bg-purple-500"></div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Validator</p>
                    <p className="text-xs text-gray-500">Reviews findings</p>
                  </div>
                </label>
              </div>
            </div>

            {/* On-Chain Registration Toggle */}
            <div className="flex flex-col gap-2">
              <label
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer hover:border-gray-600 transition-all"
                onClick={() => setRegisterOnChain(!registerOnChain)}
              >
                <div className="flex items-center gap-3">
                  <Shield className={`w-5 h-5 ${registerOnChain ? 'text-emerald-400' : 'text-gray-500'}`} />
                  <div>
                    <p className="text-sm font-medium text-white">Register on blockchain (ERC-8004)</p>
                    <p className="text-xs text-gray-500">Mints a soulbound NFT as proof of identity</p>
                  </div>
                </div>
                <div
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    registerOnChain ? 'bg-emerald-500' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      registerOnChain ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  ></div>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white text-center cursor-pointer font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Register Agent
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
