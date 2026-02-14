import { ExternalLink, Copy, Check, Shield } from 'lucide-react';
import { useState } from 'react';
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

  const categoryColors = {
    protocol: 'border-purple-500/30 bg-purple-500/5',
    agent: 'border-blue-500/30 bg-blue-500/5',
    payment: 'border-green-500/30 bg-green-500/5',
  };

  return (
    <div className={`rounded-xl border ${categoryColors[contract.category]} p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold">{contract.name}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {contract.verified && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium">
              <Check className="w-3 h-3" />
              Verified
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400 text-xs font-medium">
            {contract.standard}
          </span>
        </div>
      </div>

      <p className="text-gray-400 text-sm mb-4 leading-relaxed">{contract.description}</p>

      <div className="flex items-center gap-2 bg-gray-900/50 rounded-lg px-3 py-2">
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
  );
}

export default function ContractBadge(props: ContractBadgeProps) {
  if (props.variant === 'inline') {
    return <InlineBadge contract={props.contract} />;
  }
  return <CardBadge contract={props.contract} />;
}
