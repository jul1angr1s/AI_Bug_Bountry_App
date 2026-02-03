import { useNavigate } from 'react-router-dom';
import { Github, Activity, AlertTriangle, Clock } from 'lucide-react';
import StatusBadge from '../shared/StatusBadge';
import type { ProtocolListItem } from '../../lib/api';
import ProtocolProgressIndicator from './ProtocolProgressIndicator';

interface ProtocolCardProps {
  protocol: ProtocolListItem;
}

export default function ProtocolCard({ protocol }: ProtocolCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/protocols/${protocol.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'PAUSED':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'DEPRECATED':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <div
      onClick={handleClick}
      className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-6 hover:border-purple-500/50 transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors mb-1">
            {protocol.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Github className="w-4 h-4" />
            <span className="truncate max-w-[300px]">
              {protocol.githubUrl.replace('https://github.com/', '')}
            </span>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(protocol.status)}`}>
          {protocol.status}
        </div>
      </div>

      {/* Risk Score */}
      {protocol.riskScore !== null && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-400">Risk Score</span>
            <span className={`font-semibold ${
              protocol.riskScore >= 75 ? 'text-red-400' :
              protocol.riskScore >= 50 ? 'text-yellow-400' :
              'text-green-400'
            }`}>
              {protocol.riskScore}/100
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                protocol.riskScore >= 75 ? 'bg-red-500' :
                protocol.riskScore >= 50 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${protocol.riskScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <Activity className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-white">{protocol.scansCount}</div>
          <div className="text-xs text-gray-500">Scans</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-white">{protocol.vulnerabilitiesCount}</div>
          <div className="text-xs text-gray-500">Findings</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-sm font-medium text-white">{formatDate(protocol.createdAt)}</div>
          <div className="text-xs text-gray-500">Created</div>
        </div>
      </div>

      {/* Progress Indicator (for PENDING protocols) */}
      <ProtocolProgressIndicator protocolId={protocol.id} status={protocol.status} />

      {/* Footer */}
      <div className="pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">ID: {protocol.id.slice(0, 8)}...</span>
          <button className="text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium group-hover:underline">
            View Details →
          </button>
        </div>
      </div>
    </div>
  );
}
