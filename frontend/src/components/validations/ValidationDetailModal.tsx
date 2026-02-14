import { useQuery } from '@tanstack/react-query';
import { X, ExternalLink, Shield, FileCode, AlertTriangle, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { fetchValidationDetail } from '../../lib/api';

interface ValidationDetailModalProps {
  findingId: string;
  onClose: () => void;
}

export default function ValidationDetailModal({ findingId, onClose }: ValidationDetailModalProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['validation-detail', findingId],
    queryFn: () => fetchValidationDetail(findingId),
    enabled: !!findingId,
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VALIDATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4" /> Validated
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="w-4 h-4" /> Rejected
          </span>
        );
      case 'VALIDATING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <Loader2 className="w-4 h-4 animate-spin" /> Validating
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Validation Detail</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-600">Failed to load validation details</p>
            </div>
          )}

          {data && (
            <>
              {/* Title + Status */}
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-xl font-bold text-gray-900">{data.findingTitle}</h3>
                  {getStatusBadge(data.status)}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span>{data.protocolName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(data.severity)}`}>
                    {data.severity}
                  </span>
                  <span>{data.confidence}% confidence</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100">
                  {data.description}
                </p>
              </div>

              {/* Vulnerability Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">File Location</h4>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <FileCode className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <code className="text-sm text-gray-800 break-all">
                      {data.filePath}{data.lineNumber ? `:${data.lineNumber}` : ''}
                    </code>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Analysis Method</h4>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <span className="text-sm text-gray-800">
                      {data.analysisMethod === 'AI' ? 'AI Analysis' :
                       data.analysisMethod === 'STATIC' ? 'Static Analysis' :
                       data.analysisMethod === 'HYBRID' ? 'Hybrid (AI + Static)' :
                       data.analysisMethod || 'N/A'}
                    </span>
                    {data.aiConfidenceScore != null && (
                      <span className="text-xs text-gray-500 ml-2">
                        (AI: {data.aiConfidenceScore}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Code Snippet */}
              {data.codeSnippet && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Code Snippet</h4>
                  <pre className="text-xs bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto max-h-48">
                    <code>{data.codeSnippet}</code>
                  </pre>
                </div>
              )}

              {/* Remediation */}
              {data.remediationSuggestion && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Remediation Suggestion</h4>
                  <p className="text-sm text-gray-600 leading-relaxed bg-green-50 rounded-lg p-4 border border-green-100">
                    {data.remediationSuggestion}
                  </p>
                </div>
              )}

              {/* Proof & On-Chain */}
              {data.proof && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Proof & On-Chain Record</h4>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Proof Status</span>
                      <span className="font-medium text-gray-800">{data.proof.status}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Submitted</span>
                      <span className="text-gray-800">{new Date(data.proof.submittedAt).toLocaleString()}</span>
                    </div>
                    {data.proof.validatedAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Validated</span>
                        <span className="text-gray-800">{new Date(data.proof.validatedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {data.proof.onChainTxHash && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">On-Chain Tx</span>
                        <a
                          href={`https://sepolia.basescan.org/tx/${data.proof.onChainTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 font-mono text-xs"
                        >
                          {data.proof.onChainTxHash.slice(0, 10)}...{data.proof.onChainTxHash.slice(-8)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              {data.validatedAt && (
                <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                  Validated on {new Date(data.validatedAt).toLocaleString()}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
