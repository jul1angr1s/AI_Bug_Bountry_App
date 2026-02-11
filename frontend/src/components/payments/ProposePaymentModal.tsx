import { useState, useEffect, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProtocols } from '../../lib/api';

export interface PaymentProposal {
  protocolId: string;
  recipientAddress: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  justification: string;
}

interface Protocol {
  id: string;
  contractName: string;
  status: string;
}

interface ProposePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (proposal: PaymentProposal) => Promise<void>;
}

export function ProposePaymentModal({ isOpen, onClose, onSubmit }: ProposePaymentModalProps) {
  const [formData, setFormData] = useState<PaymentProposal>({
    protocolId: '',
    recipientAddress: '',
    severity: 'HIGH',
    justification: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof PaymentProposal, string>>>({});

  // Fetch available protocols for dropdown
  const { data: protocolsResponse, isLoading: protocolsLoading } = useQuery({
    queryKey: ['protocols-for-payment'],
    queryFn: () => fetchProtocols({ status: 'ACTIVE' }),
    enabled: isOpen,
  });

  // Extract protocols array from response (API returns { protocols: [...], pagination: {...} })
  const protocols = protocolsResponse?.protocols || [];

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
      setFormData({
        protocolId: '',
        recipientAddress: '',
        severity: 'HIGH',
        justification: '',
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PaymentProposal, string>> = {};

    if (!formData.protocolId.trim()) {
      newErrors.protocolId = 'Protocol ID is required';
    }

    if (!formData.recipientAddress.trim()) {
      newErrors.recipientAddress = 'Recipient address is required';
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.recipientAddress)) {
      newErrors.recipientAddress = 'Invalid Ethereum address format';
    }

    if (!formData.justification.trim()) {
      newErrors.justification = 'Justification is required';
    } else if (formData.justification.length < 20) {
      newErrors.justification = 'Justification must be at least 20 characters';
    } else if (formData.justification.length > 500) {
      newErrors.justification = 'Justification must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting proposal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityAmount = (severity: string) => {
    const amounts: Record<string, string> = {
      CRITICAL: '10 USDC',
      HIGH: '5 USDC',
      MEDIUM: '3 USDC',
      LOW: '1 USDC',
    };
    return amounts[severity] || '';
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
      <div className="bg-card-dark w-full max-w-lg rounded-2xl border border-accent-gold/30 shadow-2xl relative overflow-hidden flex flex-col">
        {/* Top gradient line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent-gold to-transparent opacity-50"></div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer z-10 p-2 hover:bg-white/5 rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-accent-gold/10 rounded-full text-accent-gold border border-accent-gold/20">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Propose Manual Payment</h3>
              <p className="text-slate-400 text-sm">Override protocol for special release</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Protocol Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                Protocol ID
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                </span>
                <select
                  value={formData.protocolId}
                  onChange={(e) => setFormData({ ...formData, protocolId: e.target.value })}
                  disabled={protocolsLoading}
                  className="w-full bg-background-dark border border-slate-700 rounded-lg pl-10 pr-10 py-3 text-white focus:border-accent-gold focus:ring-1 focus:ring-accent-gold outline-none transition-all appearance-none cursor-pointer text-sm disabled:opacity-50"
                >
                  <option value="">
                    {protocolsLoading ? 'Loading protocols...' : 'Select a protocol'}
                  </option>
                  {protocols?.map((protocol: Protocol) => (
                    <option key={protocol.id} value={protocol.id}>
                      {protocol.contractName} ({protocol.id.slice(0, 8)}...)
                    </option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
              {errors.protocolId && (
                <p className="text-red-400 text-xs">{errors.protocolId}</p>
              )}
            </div>

            {/* Recipient Address */}
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                Recipient Address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={formData.recipientAddress}
                  onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
                  className="w-full bg-background-dark border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:border-accent-gold focus:ring-1 focus:ring-accent-gold outline-none transition-all placeholder:text-slate-600 font-mono text-sm"
                  placeholder="0x..."
                />
              </div>
              {errors.recipientAddress && (
                <p className="text-red-400 text-xs">{errors.recipientAddress}</p>
              )}
            </div>

            {/* Severity */}
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                Severity Level
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                  className="w-full bg-background-dark border border-slate-700 rounded-lg pl-10 pr-10 py-3 text-white focus:border-accent-gold focus:ring-1 focus:ring-accent-gold outline-none transition-all appearance-none cursor-pointer text-sm"
                >
                  <option value="CRITICAL">Critical ({getSeverityAmount('CRITICAL')})</option>
                  <option value="HIGH">High ({getSeverityAmount('HIGH')})</option>
                  <option value="MEDIUM">Medium ({getSeverityAmount('MEDIUM')})</option>
                  <option value="LOW">Low ({getSeverityAmount('LOW')})</option>
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Justification */}
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                Justification
              </label>
              <textarea
                value={formData.justification}
                onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                className="w-full bg-background-dark border border-slate-700 rounded-lg p-3 text-white focus:border-accent-gold focus:ring-1 focus:ring-accent-gold outline-none transition-all placeholder:text-slate-600 resize-none text-sm"
                placeholder="Explain why this manual override is necessary..."
                rows={3}
              />
              <div className="flex justify-between text-xs">
                {errors.justification && (
                  <p className="text-red-400">{errors.justification}</p>
                )}
                <p className="text-slate-500 ml-auto">
                  {formData.justification.length}/500
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-center cursor-pointer font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-lg bg-accent-gold text-black font-bold hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-gold"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Submit Proposal
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
