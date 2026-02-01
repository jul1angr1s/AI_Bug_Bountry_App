import { CheckCircle, XCircle, Clock } from 'lucide-react';

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
}

export default function ValidationCard({ validation }: ValidationCardProps) {
  const getStatusIcon = () => {
    switch (validation.status) {
      case 'VALIDATED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (validation.status) {
      case 'VALIDATED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getSeverityColor = () => {
    switch (validation.severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {getStatusIcon()}
            <h3 className="font-semibold text-gray-900">{validation.findingTitle}</h3>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <span>{validation.protocolName}</span>
            <span>•</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor()}`}>
              {validation.severity}
            </span>
            {validation.confidence !== undefined && (
              <>
                <span>•</span>
                <span className="font-medium">{validation.confidence}% confidence</span>
              </>
            )}
          </div>

          {validation.validatedAt && (
            <p className="text-sm text-gray-500">
              Validated {new Date(validation.validatedAt).toLocaleString()}
            </p>
          )}
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {validation.status}
        </span>
      </div>
    </div>
  );
}
