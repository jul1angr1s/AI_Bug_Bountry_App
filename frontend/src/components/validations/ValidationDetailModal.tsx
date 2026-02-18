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
      case 'CRITICAL': return 'bg-red-500/15 text-red-300 border-red-500/30';
      case 'HIGH': return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
      case 'MEDIUM': return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
      default: return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VALIDATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-500/15 text-green-300 border border-green-500/30">
            <CheckCircle className="w-4 h-4" /> Validated
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-500/15 text-red-300 border border-red-500/30">
            <XCircle className="w-4 h-4" /> Rejected
          </span>
        );
      case 'VALIDATING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <Loader2 className="w-4 h-4 animate-spin" /> Validating
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
            <Clock className="w-4 h-4" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700 bg-navy-900/60">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-white">Validation Detail</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-navy-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-300">Failed to load validation details</p>
            </div>
          )}

          {data && (
            <>
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-xl font-bold text-white">{data.findingTitle}</h3>
                  {getStatusBadge(data.status)}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span>{data.protocolName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(data.severity)}`}>
                    {data.severity}
                  </span>
                  <span>{data.confidence}% confidence</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Description</h4>
                <p className="text-sm text-gray-300 leading-relaxed bg-navy-900/50 rounded-lg p-4 border border-navy-700">
                  {data.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">File Location</h4>
                  <div className="flex items-center gap-2 bg-navy-900/50 rounded-lg p-3 border border-navy-700">
                    <FileCode className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <code className="text-sm text-gray-200 break-all">
                      {data.filePath}{data.lineNumber ? `:${data.lineNumber}` : ''}
                    </code>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Analysis Method</h4>
                  <div className="bg-navy-900/50 rounded-lg p-3 border border-navy-700">
                    <span className="text-sm text-gray-200">
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

              {data.codeSnippet && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Code Snippet</h4>
                  <pre className="text-xs bg-black/60 text-gray-100 rounded-lg p-4 overflow-x-auto max-h-48 border border-navy-700">
                    <code>{data.codeSnippet}</code>
                  </pre>
                </div>
              )}

              {data.remediationSuggestion && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Remediation Suggestion</h4>
                  <p className="text-sm text-gray-200 leading-relaxed bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                    {data.remediationSuggestion}
                  </p>
                </div>
              )}

              {data.proof && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Proof & On-Chain Record</h4>
                  <div className="bg-navy-900/50 rounded-lg p-4 border border-navy-700 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Proof Status</span>
                      <span className="font-medium text-gray-200">{data.proof.status}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Submitted</span>
                      <span className="text-gray-200">{new Date(data.proof.submittedAt).toLocaleString()}</span>
                    </div>
                    {data.proof.validatedAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Validated</span>
                        <span className="text-gray-200">{new Date(data.proof.validatedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {data.proof.onChainTxHash && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">On-Chain Tx</span>
                        <a
                          href={`https://sepolia.basescan.org/tx/${data.proof.onChainTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:text-blue-300 font-mono text-xs"
                        >
                          {data.proof.onChainTxHash.slice(0, 10)}...{data.proof.onChainTxHash.slice(-8)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {data.validatedAt && (
                <div className="text-xs text-gray-500 pt-2 border-t border-navy-700">
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
