import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Zap,
  Search,
  FileText,
  GitBranch,
} from 'lucide-react';
import { fetchScan, fetchScanFindings, type Finding } from '../lib/api';
import { LoadingSkeleton } from '../components/shared/LoadingSkeleton';
import SeverityBadge from '../components/shared/SeverityBadge';

type TabType = 'overview' | 'findings' | 'steps';

export default function ScanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Fetch scan details
  const {
    data: scan,
    isLoading: scanLoading,
    isError: scanError,
  } = useQuery({
    queryKey: ['scan', id],
    queryFn: () => fetchScan(id!),
    enabled: !!id,
  });

  // Fetch scan findings
  const {
    data: findingsData,
    isLoading: findingsLoading,
  } = useQuery({
    queryKey: ['scan-findings', id],
    queryFn: () => fetchScanFindings(id!),
    enabled: !!id && activeTab === 'findings',
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return <Clock className="w-6 h-6 text-yellow-400" />;
      case 'RUNNING':
        return <Zap className="w-6 h-6 text-blue-400 animate-pulse" />;
      case 'SUCCEEDED':
        return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'FAILED':
        return <XCircle className="w-6 h-6 text-red-400" />;
      case 'CANCELED':
        return <AlertCircle className="w-6 h-6 text-gray-400" />;
      default:
        return <Search className="w-6 h-6 text-gray-400" />;
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (start: string, end?: string) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);

    if (diffMins > 0) {
      return `${diffMins}m ${diffSecs}s`;
    }
    return `${diffSecs}s`;
  };

  if (scanLoading) {
    return (
      <div className="min-h-screen bg-[#0f1419] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <LoadingSkeleton className="h-64 mb-6" />
          <LoadingSkeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (scanError || !scan) {
    return (
      <div className="min-h-screen bg-[#0f1419] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Scan Not Found</h2>
            <p className="text-gray-400 mb-6">The scan you're looking for doesn't exist or you don't have access to it.</p>
            <button
              onClick={() => navigate('/scans')}
              className="px-6 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Back to Scans
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/scans')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Scans
        </button>

        {/* Header */}
        <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
                {getStatusIcon(scan.state)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Scan Details
                </h1>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span className="font-mono">{scan.id.slice(0, 8)}...</span>
                  <span>•</span>
                  <span>{formatDate(scan.startedAt)}</span>
                </div>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-medium border flex items-center gap-2 ${getStatusColor(scan.state)}`}>
              {getStatusIcon(scan.state)}
              {scan.state}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Findings</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {scan.findingsSummary?.total || 0}
              </div>
            </div>
            <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Duration</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {calculateDuration(scan.startedAt, scan.finishedAt)}
              </div>
            </div>
            <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <GitBranch className="w-4 h-4" />
                <span className="text-sm">Current Step</span>
              </div>
              <div className="text-sm font-medium text-white">
                {scan.currentStep || 'N/A'}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {scan.analysisSummary?.degraded && scan.analysisSummary.warnings?.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-400 mb-1">Analysis Warning</h3>
                  {scan.analysisSummary.warnings.map((warning) => (
                    <p key={warning} className="text-sm text-gray-300">{warning}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {scan.state === 'FAILED' && scan.errorMessage && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-400 mb-1">Error Details</h3>
                  <p className="text-sm text-gray-300">
                    {scan.errorCode === 'SCAN_INCONCLUSIVE_AI_ZERO_FINDINGS'
                      ? 'AI scan was inconclusive (no actionable findings). This is not a clean security result.'
                      : scan.errorMessage}
                  </p>
                  {scan.errorCode && (
                    <p className="text-xs text-gray-500 mt-1">Error Code: {scan.errorCode}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg">
          <div className="border-b border-gray-800">
            <nav className="flex gap-4 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('findings')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'findings'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Findings {scan.findingsSummary?.total ? `(${scan.findingsSummary.total})` : ''}
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Scan Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-400">Scan ID</span>
                      <p className="text-white font-mono text-sm mt-1">{scan.id}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Status</span>
                      <p className="text-white text-sm mt-1">{scan.state}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Started At</span>
                      <p className="text-white text-sm mt-1">{formatDate(scan.startedAt)}</p>
                    </div>
                    {scan.finishedAt && (
                      <div>
                        <span className="text-sm text-gray-400">Finished At</span>
                        <p className="text-white text-sm mt-1">{formatDate(scan.finishedAt)}</p>
                      </div>
                    )}
                    {scan.retryCount > 0 && (
                      <div>
                        <span className="text-sm text-gray-400">Retry Count</span>
                        <p className="text-white text-sm mt-1">{scan.retryCount}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Findings Summary by Severity */}
                {scan.findingsSummary && Object.keys(scan.findingsSummary.bySeverity).length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Findings by Severity</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {Object.entries(scan.findingsSummary.bySeverity).map(([severity, count]) => (
                        <div
                          key={severity}
                          className="bg-[#0f1419] border border-gray-800 rounded-lg p-3 text-center"
                        >
                          <SeverityBadge severity={severity as any} />
                          <div className="text-2xl font-bold text-white mt-2">{count as number}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'findings' && (
              <div>
                {findingsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <LoadingSkeleton key={i} className="h-32" />
                    ))}
                  </div>
                ) : findingsData && findingsData.findings.length > 0 ? (
                  <div className="space-y-4">
                    {findingsData.findings.map((finding: Finding) => (
                      <div
                        key={finding.id}
                        className="bg-[#0f1419] border border-gray-800 rounded-lg p-4 hover:border-blue-500/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                              <h4 className="text-white font-medium mb-1">{finding.vulnerabilityType}</h4>
                              <p className="text-sm text-gray-400">{finding.description}</p>
                            </div>
                          </div>
                          <SeverityBadge severity={finding.severity} />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="font-mono">{finding.filePath}</span>
                          {finding.lineNumber && <span>Line {finding.lineNumber}</span>}
                          <span className="px-2 py-1 bg-gray-800 rounded text-xs">
                            {finding.confidenceScore}% confidence
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No findings for this scan</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
