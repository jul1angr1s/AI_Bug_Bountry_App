import { useNavigate } from 'react-router-dom';
import { Zap, CheckCircle, XCircle, AlertCircle, Clock, Search } from 'lucide-react';
import type { Scan } from '../../lib/api';

interface ScanCardProps {
  scan: Scan;
}

export default function ScanCard({ scan }: ScanCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/scans/${scan.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'RUNNING':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'SUCCEEDED':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'FAILED':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'CANCELED':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return <Clock className="w-4 h-4" />;
      case 'RUNNING':
        return <Zap className="w-4 h-4 animate-pulse" />;
      case 'SUCCEEDED':
        return <CheckCircle className="w-4 h-4" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4" />;
      case 'CANCELED':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
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

  const getProgressPercentage = () => {
    // Placeholder logic for progress - can be enhanced with more detailed step tracking
    if (scan.state === 'QUEUED') return 10;
    if (scan.state === 'RUNNING') return 50;
    if (scan.state === 'SUCCEEDED') return 100;
    if (scan.state === 'FAILED') return 0;
    if (scan.state === 'CANCELED') return 0;
    return 0;
  };

  const protocolName = scan.protocol?.contractName || 'Unknown Protocol';

  return (
    <div
      onClick={handleClick}
      className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-6 hover:border-blue-500/50 transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors mb-1">
            {protocolName}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Search className="w-4 h-4" />
            <span className="truncate max-w-[300px]">
              Scan ID: {scan.id.slice(0, 8)}...
            </span>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-2 ${getStatusColor(scan.state)}`}>
          {getStatusIcon(scan.state)}
          {scan.state}
        </div>
      </div>

      {/* Progress Bar (if running) */}
      {scan.state === 'RUNNING' && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-400">Progress</span>
            {scan.currentStep && (
              <span className="text-blue-400 font-medium">{scan.currentStep}</span>
            )}
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500 animate-pulse"
              style={{ width: '50%' }}
            />
          </div>
        </div>
      )}

      {/* Current Step (if available) */}
      {scan.currentStep && scan.state !== 'RUNNING' && (
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Last Step:</span>
            <span className="text-sm text-gray-300">{scan.currentStep}</span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-white">{scan.findingsCount}</div>
          <div className="text-xs text-gray-500">Findings</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-sm font-medium text-white">{formatDate(scan.startedAt)}</div>
          <div className="text-xs text-gray-500">Started</div>
        </div>
      </div>

      {/* Error Message (if failed) */}
      {scan.state === 'FAILED' && scan.errorMessage && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded">
          <p className="text-xs text-red-400 line-clamp-2">{scan.errorMessage}</p>
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {scan.retryCount > 0 && `Retries: ${scan.retryCount}`}
          </span>
          <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium group-hover:underline">
            View Details →
          </button>
        </div>
      </div>
    </div>
  );
}
