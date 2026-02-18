import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Protocol } from '@/types/dashboard';
import { GlowCard } from '../shared/GlowCard';
import { MaterialIcon } from '../shared/MaterialIcon';
import { PulseIndicator } from '../shared/PulseIndicator';
import { ScanProgressModal } from './ScanProgressModal';
import { useLatestScan } from '@/hooks/useLatestScan';
import { deleteProtocol } from '@/lib/api';

interface ModernProtocolCardProps {
  protocol: Protocol;
  onDelete?: () => void;
}

export default function ModernProtocolCard({ protocol, onDelete }: ModernProtocolCardProps) {
  const navigate = useNavigate();
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data: latestScan } = useLatestScan(protocol.id);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProtocol(protocol.id);
      toast.success(`"${protocol.contractName}" has been deleted`);
      setShowDeleteModal(false);
      onDelete?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete protocol');
    } finally {
      setIsDeleting(false);
    }
  };

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
          label: 'Registering',
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

  // Check if there's an active scan running
  const hasActiveScan = latestScan && (
    latestScan.state === 'RUNNING' || 
    latestScan.state === 'QUEUED' || 
    latestScan.state === 'PENDING'
  );

  // Show progress view only when there's an actual active scan
  const showProgressView = hasActiveScan;

  return (
    <GlowCard
      glowColor="purple"
      className="relative overflow-hidden cursor-pointer group hover:border-primary/50 transition-all duration-300"
      onClick={handleClick}
    >
      {/* Background Icon */}
      <MaterialIcon
        name="shield"
        className="absolute -right-5 -bottom-6 text-[120px] text-purple-500/10 group-hover:text-purple-400/20 transition-colors duration-300"
      />

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
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors font-['Space_Grotesk']">
                {protocol.contractName}
              </h3>
              {protocol.version && protocol.version > 1 && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  v{protocol.version}
                </span>
              )}
              {protocol.registrationType === 'DELTA' && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  Delta
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400">{truncateAddress(protocol.ownerAddress)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge with Pulse */}
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded text-xs font-medium border ${statusConfig.color}`}>
            <PulseIndicator status={statusConfig.pulseStatus} size="sm" />
            <span>{statusConfig.label}</span>
          </div>

          {/* Kebab Menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu((prev) => !prev);
              }}
              className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-navy-900/80 transition-colors"
            >
              <MaterialIcon name="more_vert" className="text-xl" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-[#1a1f2e] border border-gray-700 rounded-lg shadow-xl z-30 overflow-hidden">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    setShowDeleteModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <MaterialIcon name="delete" className="text-lg" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="relative z-10 grid grid-cols-2 gap-3 mb-4">
        {/* Security Score */}
        <div className="rounded-lg border border-navy-700/60 bg-navy-900/45 p-3">
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
        <div className="rounded-lg border border-navy-700/60 bg-navy-900/45 p-3">
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
          <div className="w-full bg-navy-900 rounded-full h-2 overflow-hidden border border-navy-700/60">
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
          {showProgressView ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProgressModal(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-sm font-medium text-cyan-300 hover:bg-cyan-500/25 transition-all"
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isDeleting && setShowDeleteModal(false)}
          />
          <div className="relative bg-[#1a1f2e] border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-6 border-b border-gray-700">
              <div className="p-2 bg-red-500/20 rounded-full">
                <MaterialIcon name="warning" className="text-2xl text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Delete Protocol</h2>
                <p className="text-sm text-gray-400">{protocol.contractName}</p>
              </div>
              <button
                onClick={() => !isDeleting && setShowDeleteModal(false)}
                className="ml-auto p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <MaterialIcon name="close" className="text-xl text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-300">
                Are you sure you want to delete <span className="font-semibold text-white">{protocol.contractName}</span>? This action is permanent and cannot be undone.
              </p>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-xs text-red-400">
                  All associated data will be removed, including scans, findings, and payment records.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-700 bg-[#0f1723]">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <MaterialIcon name="delete" className="text-lg" />
                    Delete Protocol
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </GlowCard>
  );
}
