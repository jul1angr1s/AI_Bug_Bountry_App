import { ExternalLink, Copy, Check, Shield } from 'lucide-react';
import { useState } from 'react';
import { GlowCard } from './GlowCard';
import { MaterialIcon } from './MaterialIcon';
import { PulseIndicator } from './PulseIndicator';
import { getExplorerAddressUrl, truncateHash } from '../../lib/utils';
import type { ContractInfo } from '../../lib/contracts';

interface InlineBadgeProps {
  variant: 'inline';
  contract: ContractInfo;
}

interface CardBadgeProps {
  variant: 'card';
  contract: ContractInfo;
}

type ContractBadgeProps = InlineBadgeProps | CardBadgeProps;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-gray-600 transition-colors text-gray-400 hover:text-white"
      title="Copy address"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function InlineBadge({ contract }: { contract: ContractInfo }) {
  if (!contract.address) return null;

  return (
    <a
      href={getExplorerAddressUrl(contract.address)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 hover:border-gray-500 transition-colors text-xs group"
    >
      <Shield className="w-3 h-3 text-blue-400" />
      <span className="text-gray-300 font-medium">{contract.name}</span>
      <span className="text-gray-500">{truncateHash(contract.address)}</span>
      <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-blue-400 transition-colors" />
    </a>
  );
}

function CardBadge({ contract }: { contract: ContractInfo }) {
  if (!contract.address) return null;

  const categoryConfig: Record<ContractInfo['category'], { glow: 'purple' | 'blue' | 'green'; chip: string; icon: string }> = {
    protocol: {
      glow: 'purple',
      chip: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
      icon: 'account_tree',
    },
    agent: {
      glow: 'blue',
      chip: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
      icon: 'smart_toy',
    },
    payment: {
      glow: 'green',
      chip: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
      icon: 'payments',
    },
  };

  const config = categoryConfig[contract.category];

  return (
    <GlowCard glowColor={config.glow} className="relative overflow-hidden group">
      <MaterialIcon
        name={config.icon}
        className="absolute -right-5 -bottom-6 text-[110px] text-navy-700/25 group-hover:text-primary/15 transition-colors duration-300"
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <PulseIndicator status={contract.verified ? 'active' : 'idle'} size="sm" />
              <h3 className="text-white font-semibold truncate">{contract.name}</h3>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
              <MaterialIcon name="deployed_code" className="text-sm" />
              <span className="uppercase tracking-wide">{contract.standard}</span>
            </div>
          </div>
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border ${config.chip}`}>
            <span className="capitalize">{contract.category}</span>
          </div>
        </div>

        <p className="text-sm text-gray-400 mb-4 line-clamp-2">{contract.description}</p>

        <div className="mb-4 flex flex-wrap gap-2">
          {contract.verified ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-green-300 text-xs font-medium">
              <Check className="w-3 h-3" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-500/10 border border-gray-500/30 text-gray-300 text-xs font-medium">
              <MaterialIcon name="schedule" className="text-sm" />
              Verification Pending
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-navy-700/60 bg-navy-900/50 px-3 py-2">
          <code className="text-xs text-gray-300 font-mono flex-1 truncate">{contract.address}</code>
          <CopyButton text={contract.address} />
          <a
            href={getExplorerAddressUrl(contract.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded hover:bg-gray-600 transition-colors text-gray-400 hover:text-blue-400"
            title="View on BaseScan"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </GlowCard>
  );
}

export default function ContractBadge(props: ContractBadgeProps) {
  if (props.variant === 'inline') {
    return <InlineBadge contract={props.contract} />;
  }
  return <CardBadge contract={props.contract} />;
}
