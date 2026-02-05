import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Protocol } from '@/types/dashboard';
import { GlowCard } from '../shared/GlowCard';
import { MaterialIcon } from '../shared/MaterialIcon';
import { PulseIndicator } from '../shared/PulseIndicator';
import { ScanProgressModal } from './ScanProgressModal';

interface ModernProtocolCardProps {
  protocol: Protocol;
}

export default function ModernProtocolCard({ protocol }: ModernProtocolCardProps) {
  const navigate = useNavigate();
  const [showProgressModal, setShowProgressModal] = useState(false);

  const handleClick = () => {
    navigate(`/protocols/${protocol.id}`);
  };

  const handleCodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(protocol.githubUrl, '_blank');
  };

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/protocols/${protocol.id}`);
  };

  // Truncate address to 0x...XXXX format
  const truncateAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Get status badge configuration
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return {
          color: 'bg-green-500/20 text-green-400 border-green-500/30',
          pulseStatus: 'active' as const,
          label: 'Active',
        };
      case 'PENDING':
        return {
          color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          pulseStatus: 'active' as const,
          label: 'Scanning',
        };
      case 'PAUSED':
        return {
          color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
          pulseStatus: 'idle' as const,
          label: 'Paused',
        };
      case 'DEPRECATED':
        return {
          color: 'bg-red-500/20 text-red-400 border-red-500/30',
          pulseStatus: 'error' as const,
          label: 'Deprecated',
        };
      default:
        return {
          color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
          pulseStatus: 'idle' as const,
          label: status,
        };
    }
  };

  // Get gradient avatar background
  const getAvatarGradient = (id: string) => {
    const gradients = [
      'bg-gradient-to-br from-purple-500 to-pink-500',
      'bg-gradient-to-br from-blue-500 to-cyan-500',
      'bg-gradient-to-br from-orange-500 to-red-500',
      'bg-gradient-to-br from-green-500 to-emerald-500',
      'bg-gradient-to-br from-pink-500 to-rose-500',
    ];
    // Use first character of ID to determine gradient
    const index = id.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  // Get initials from contract name
  const getInitials = (name: string) => {
    if (!name) return '??';
    const words = name.split(/[\s_-]+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Calculate security score (100 - risk score)
  const securityScore = protocol.riskScore !== null && protocol.riskScore !== undefined
    ? 100 - protocol.riskScore
    : null;

  // Get security score color
  const getSecurityScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Get progress bar gradient
  const getProgressGradient = (score: number) => {
    if (score >= 75) return 'bg-gradient-to-r from-green-500 to-emerald-500';
    if (score >= 50) return 'bg-gradient-to-r from-yellow-500 to-orange-500';
    return 'bg-gradient-to-r from-red-500 to-pink-500';
  };

  // Count critical findings
  const criticalFindings = protocol.vulnerabilitiesCount || 0;

  const statusConfig = getStatusConfig(protocol.status);

  return (
    <GlowCard
      glowColor="purple"
      className="relative cursor-pointer group hover:border-primary/50 transition-all duration-300"
      onClick={handleClick}
    >
      {/* Background Icon */}
      <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <MaterialIcon name="shield" className="text-8xl" />
      </div>

      {/* Header with Avatar and Status Badge */}
      <div className="relative z-10 flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Protocol Avatar */}
          <div
            className={`w-12 h-12 rounded-lg ${getAvatarGradient(protocol.id)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}
          >
            {getInitials(protocol.contractName)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors font-['Space_Grotesk']">
              {protocol.contractName}
            </h3>
            <p className="text-sm text-gray-400">{truncateAddress(protocol.ownerAddress)}</p>
          </div>
        </div>

        {/* Status Badge with Pulse */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${statusConfig.color}`}
        >
          <PulseIndicator status={statusConfig.pulseStatus} size="sm" />
          <span>{statusConfig.label}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="relative z-10 grid grid-cols-2 gap-4 mb-4">
        {/* Security Score */}
        <div className="bg-navy-900/50 rounded-lg p-3 border border-navy-700/50">
          <div className="flex items-center gap-2 mb-2">
            <MaterialIcon name="security" className="text-lg text-gray-400" />
            <span className="text-xs text-gray-400">Security Score</span>
          </div>
          {securityScore !== null ? (
            <p className={`text-2xl font-bold ${getSecurityScoreColor(securityScore)}`}>
              {securityScore}%
            </p>
          ) : (
            <p className="text-2xl font-bold text-gray-500">N/A</p>
          )}
        </div>

        {/* Bounty Pool */}
        <div className="bg-navy-900/50 rounded-lg p-3 border border-navy-700/50">
          <div className="flex items-center gap-2 mb-2">
            <MaterialIcon name="emoji_events" className="text-lg text-gray-400" />
            <span className="text-xs text-gray-400">Bounty Pool</span>
          </div>
          <p className="text-2xl font-bold text-white">
            ${(parseFloat(protocol.totalBountyPool) / 1e6).toFixed(1)}k
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {securityScore !== null && (
        <div className="relative z-10 mb-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Security Assessment</span>
            <span className={getSecurityScoreColor(securityScore)}>{securityScore}%</span>
          </div>
          <div className="w-full bg-navy-900 rounded-full h-2 overflow-hidden border border-navy-700/50">
            <div
              className={`h-full transition-all duration-500 ${getProgressGradient(securityScore)}`}
              style={{ width: `${securityScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="relative z-10 pt-4 border-t border-navy-700/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm">
            <MaterialIcon name="warning" className="text-lg text-red-400" />
            <span className="text-gray-400">
              {criticalFindings} {criticalFindings === 1 ? 'Finding' : 'Findings'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <MaterialIcon name="analytics" className="text-lg" />
            <span>{protocol.scansCount || 0} Scans</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {protocol.status === 'PENDING' ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProgressModal(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm font-medium text-blue-400 hover:bg-blue-500/30 transition-all"
              >
                <MaterialIcon name="terminal" className="text-lg animate-pulse" />
                <span>View Progress</span>
              </button>
              <button
                onClick={handleDetailsClick}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-sm font-medium text-white hover:shadow-glow-purple transition-all"
              >
                <span>Details</span>
                <MaterialIcon name="arrow_forward" className="text-lg" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCodeClick}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:border-gray-600 transition-all"
              >
                <MaterialIcon name="code" className="text-lg" />
                <span>Code</span>
              </button>
              <button
                onClick={handleDetailsClick}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-sm font-medium text-white hover:shadow-glow-purple transition-all"
              >
                <span>Details</span>
                <MaterialIcon name="arrow_forward" className="text-lg" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Scan Progress Modal */}
      {showProgressModal && (
        <ScanProgressModal
          protocolId={protocol.id}
          onClose={() => setShowProgressModal(false)}
        />
      )}
    </GlowCard>
  );
}
