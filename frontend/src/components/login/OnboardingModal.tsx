import { useEffect } from 'react';
import { X, Shield, Search, ShieldCheck, DollarSign } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    number: 1,
    title: 'Protocol Registration',
    description: 'Register your smart contract protocol with on-chain identity verification via ERC-8004.',
    Icon: Shield,
    color: 'cyan' as const,
  },
  {
    number: 2,
    title: 'AI Research',
    description: 'Autonomous researcher agents scan your codebase for vulnerabilities using AI-powered analysis.',
    Icon: Search,
    color: 'purple' as const,
  },
  {
    number: 3,
    title: 'Validation',
    description: 'Independent validator agents verify findings, eliminating false positives through consensus.',
    Icon: ShieldCheck,
    color: 'green' as const,
  },
  {
    number: 4,
    title: 'Automated Payment',
    description: 'Verified bounties are paid automatically on-chain via x.402 payment protocol. No manual approval.',
    Icon: DollarSign,
    color: 'blue' as const,
  },
];

const colorClasses = {
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    number: 'bg-cyan-500',
    line: 'bg-cyan-500/20',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    number: 'bg-purple-500',
    line: 'bg-purple-500/20',
  },
  green: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    number: 'bg-emerald-500',
    line: 'bg-emerald-500/20',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    number: 'bg-blue-500',
    line: 'bg-blue-500/20',
  },
};

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gray-900 w-full max-w-lg rounded-2xl border border-gray-700 shadow-2xl relative overflow-hidden animate-fade-in-up">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-cyan via-accent-purple to-blue-500 opacity-60" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer z-10 p-2 hover:bg-white/5 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h3 className="text-2xl font-bold text-white font-heading">How It Works</h3>
            <p className="text-gray-400 text-sm mt-1">
              End-to-end autonomous security in 4 steps
            </p>
          </div>

          {/* Steps timeline */}
          <div className="space-y-0">
            {steps.map((step, index) => {
              const classes = colorClasses[step.color];
              return (
                <div key={step.number} className="flex gap-4">
                  {/* Timeline column */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full ${classes.number} flex items-center justify-center text-white text-sm font-bold shrink-0`}
                    >
                      {step.number}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-0.5 flex-1 my-1 ${classes.line}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`pb-6 ${index === steps.length - 1 ? 'pb-0' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <step.Icon className={`w-4 h-4 ${classes.text}`} />
                      <h4 className="text-white font-semibold text-sm">{step.title}</h4>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dismiss button */}
          <button
            onClick={onClose}
            className="w-full mt-8 py-3 px-6 rounded-lg bg-white/5 border border-gray-700 text-white font-semibold hover:bg-white/10 transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
