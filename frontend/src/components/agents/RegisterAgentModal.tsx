import { useState, useEffect } from 'react';
import { X, UserPlus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { AgentIdentityType } from '../../types/dashboard';

interface RegisterAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistrationComplete: () => void;
}

export function RegisterAgentModal({ isOpen, onClose, onRegistrationComplete }: RegisterAgentModalProps) {
  void onRegistrationComplete;

  const [agentType, setAgentType] = useState<AgentIdentityType>('RESEARCHER');
  const [resourceUrl, setResourceUrl] = useState('');
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
      setAgentType('RESEARCHER');
      setResourceUrl('');
      setError(null);
    }
  }, [isOpen]);

  const isValidHttpUrl = (value: string): boolean => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedUrl = resourceUrl.trim();

    if (!trimmedUrl) {
      setError('Resource URL is required');
      return;
    }
    if (!isValidHttpUrl(trimmedUrl)) {
      setError('Enter a valid http/https URL.');
      return;
    }

    setError(null);
    toast.info('Coming soon');
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
              <p className="text-gray-400 text-sm">Hire through Coinbase Bazaar discovery</p>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase font-semibold text-gray-400 tracking-wider">
                Resource URL (Coinbase Bazaar Discovery)
              </label>
              <input
                type="url"
                value={resourceUrl}
                onChange={(e) => {
                  setResourceUrl(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-600 text-sm"
                placeholder="https://www.coinbase.com/es-la/developer-platform/discover/launches/x402-bazaar"
              />
              <p className="text-gray-500 text-xs">
                Paste the agent discovery resource URL from Coinbase Bazaar.
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
                className="flex-1 py-3 px-4 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Hire Researcher Agent from Coinbase Bazaar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
