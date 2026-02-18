import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

interface ValidationCardProps {
  validation: {
    id: string;
    findingTitle: string;
    protocolName: string;
    severity: string;
    status: string;
    confidence?: number;
    validatedAt?: string;
  };
  onClick?: () => void;
}

export default function ValidationCard({ validation, onClick }: ValidationCardProps) {
  const getStatusIcon = () => {
    switch (validation.status) {
      case 'VALIDATED':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'VALIDATING':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusColor = () => {
    switch (validation.status) {
      case 'VALIDATED':
        return 'bg-green-500/15 text-green-300 border-green-500/30';
      case 'REJECTED':
        return 'bg-red-500/15 text-red-300 border-red-500/30';
      case 'VALIDATING':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      default:
        return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
    }
  };

  const getSeverityColor = () => {
    switch (validation.severity) {
      case 'CRITICAL':
        return 'bg-red-500/15 text-red-300 border-red-500/30';
      case 'HIGH':
        return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
      case 'MEDIUM':
        return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div
      className={`bg-navy-800 rounded-xl p-6 border border-navy-700 hover:border-primary/50 hover:shadow-glow-blue transition-all ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            {getStatusIcon()}
            <h3 className="font-semibold text-white truncate">{validation.findingTitle}</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400 mb-3">
            <span>{validation.protocolName}</span>
            <span>•</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor()}`}>
              {validation.severity}
            </span>
            {validation.confidence !== undefined && (
              <>
                <span>•</span>
                <span className="font-medium text-gray-300">{validation.confidence}% confidence</span>
              </>
            )}
          </div>

          {validation.validatedAt && (
            <p className="text-sm text-gray-500">
              Validated {new Date(validation.validatedAt).toLocaleString()}
            </p>
          )}
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
          {validation.status}
        </span>
      </div>
    </div>
  );
}
