import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Github, ExternalLink, Play, FileText, Shield, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useProtocol, useProtocolRealtime } from '../hooks/useProtocol';
import { useQuery } from '@tanstack/react-query';
import { fetchScans, fetchScanFindings } from '../lib/api';
import ProtocolStats from '../components/protocols/ProtocolStats';
import { LoadingSkeleton } from '../components/shared/LoadingSkeleton';
import StatusBadge from '../components/shared/StatusBadge';
import RegistrationProgress from '../components/protocols/RegistrationProgress';
import ScanProgressLive from '../components/protocols/ScanProgressLive';
import { useLatestScan } from '../hooks/useLatestScan';

type TabType = 'overview' | 'scans' | 'findings' | 'payments';

export default function ProtocolDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const { data: protocol, isLoading, isError, error } = useProtocol(id || '');
  useProtocolRealtime(id || '');
  const { data: latestScan } = useLatestScan(id || '');

  // Fetch scans when scans tab is active
  const { data: scansData, isLoading: scansLoading } = useQuery({
    queryKey: ['scans', id],
    queryFn: () => fetchScans(id || '', 50),
    enabled: !!id && activeTab === 'scans',
  });

  // Fetch findings when findings tab is active
  const { data: findingsData, isLoading: findingsLoading } = useQuery({
    queryKey: ['findings', id],
    queryFn: async () => {
      // Get recent scans and find the first SUCCEEDED scan
      const scans = await fetchScans(id || '', 10);
      const succeededScan = scans.scans.find((scan) => scan.state === 'SUCCEEDED');

      if (succeededScan) {
        return fetchScanFindings(succeededScan.id);
      }
      return { findings: [], total: 0, scanId: '' };
    },
    enabled: !!id && activeTab === 'findings',
  });

  const handleBack = () => {
    navigate('/protocols');
  };

  const handleTriggerScan = () => {
    // TODO: Implement scan triggering
    console.log('Trigger scan for protocol:', id);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f1419] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <LoadingSkeleton className="h-8 w-32 mb-6" />
          <LoadingSkeleton className="h-32 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <LoadingSkeleton key={i} className="h-32" />
            ))}
          </div>
          <LoadingSkeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !protocol) {
    return (
      <div className="min-h-screen bg-[#0f1419] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Protocols
          </button>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-12 text-center">
            <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Protocol Not Found</h2>
            <p className="text-gray-400 mb-6">
              {error instanceof Error ? error.message : 'The requested protocol could not be found.'}
            </p>
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Back to Protocols
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mock data for demonstration (replace with real data from backend)
  const mockStats = {
    totalScans: protocol.scansCount || 0,
    vulnerabilitiesFound: protocol.vulnerabilitiesCount || 0,
    totalPaid: '$0.00',
    activeResearchers: 0,
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', count: null },
    { id: 'scans' as TabType, label: 'Scans', count: protocol.scansCount },
    { id: 'findings' as TabType, label: 'Findings', count: protocol.vulnerabilitiesCount },
    { id: 'payments' as TabType, label: 'Payments', count: null },
  ];

  return (
    <div className="min-h-screen bg-[#0f1419] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Protocols
        </button>

        {/* Protocol Header */}
        <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
                  <Shield className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">{protocol.contractName || 'Unknown Protocol'}</h1>
                  <div className="flex items-center gap-3 mt-2">
                    <StatusBadge status={protocol.status} />
                    {protocol.riskScore !== null && (
                      <span className={`text-sm font-medium ${
                        protocol.riskScore >= 75 ? 'text-red-400' :
                        protocol.riskScore >= 50 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        Risk Score: {protocol.riskScore}/100
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400">
                <a
                  href={protocol.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-purple-400 transition-colors"
                >
                  <Github className="w-4 h-4" />
                  {protocol.githubUrl?.replace('https://github.com/', '') || protocol.githubUrl}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-gray-600">•</span>
                <span>Created {new Date(protocol.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleTriggerScan}
                className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Trigger Scan
              </button>
              <button className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
                <FileText className="w-4 h-4" />
                View Report
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8">
          <ProtocolStats stats={mockStats} />
        </div>

        {/* Tabs */}
        <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/5'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-gray-700 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Protocol Overview</h3>

                {/* Live Progress Card */}
                {protocol.status === 'PENDING' && (
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-6 mb-6">
                    <h4 className="text-base font-semibold text-white mb-4">Registration Progress</h4>
                    <RegistrationProgress protocolId={id || ''} />
                  </div>
                )}

                {latestScan && (latestScan.state === 'RUNNING' || latestScan.state === 'PENDING') && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-6 mb-6">
                    <h4 className="text-base font-semibold text-white mb-4">Scan in Progress</h4>
                    <ScanProgressLive scanId={latestScan.id} />
                  </div>
                )}

                <div className="space-y-4 text-gray-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Contract Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Contract Path:</span>
                          <span className="text-gray-300 font-mono">{protocol.contractPath || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Contract Name:</span>
                          <span className="text-gray-300 font-mono">{protocol.contractName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Branch:</span>
                          <span className="text-gray-300">{protocol.branch || 'main'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Activity Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Scans:</span>
                          <span className="text-gray-300">{protocol.scansCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Vulnerabilities:</span>
                          <span className="text-gray-300">{protocol.vulnerabilitiesCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Last Updated:</span>
                          <span className="text-gray-300">{new Date(protocol.updatedAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity Timeline */}
                  <div className="mt-8">
                    <h4 className="text-sm font-medium text-gray-400 mb-4">Recent Activity</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-gray-800/30 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm text-gray-300">Protocol registered successfully</p>
                          <p className="text-xs text-gray-500">{new Date(protocol.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      {/* More timeline items would be added here from real data */}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'scans' && (
              <div>
                {scansLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <LoadingSkeleton key={i} className="h-24" />
                    ))}
                  </div>
                ) : scansData && scansData.scans.length > 0 ? (
                  <div className="space-y-4">
                    {scansData.scans.map((scan) => (
                      <div key={scan.id} className="p-4 bg-gray-800/30 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-mono text-gray-400">
                                #{scan.id.substring(0, 8)}
                              </span>
                              {scan.state === 'SUCCEEDED' && (
                                <span className="flex items-center gap-1 text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                                  <CheckCircle className="w-3 h-3" />
                                  Succeeded
                                </span>
                              )}
                              {scan.state === 'FAILED' && (
                                <span className="flex items-center gap-1 text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">
                                  <XCircle className="w-3 h-3" />
                                  Failed
                                </span>
                              )}
                              {scan.state === 'RUNNING' && (
                                <span className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                                  <Clock className="w-3 h-3" />
                                  Running
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span>Started: {new Date(scan.startedAt).toLocaleString()}</span>
                              {scan.finishedAt && (
                                <span>Finished: {new Date(scan.finishedAt).toLocaleString()}</span>
                              )}
                              <span className="text-purple-400">{scan.findingsCount} findings</span>
                            </div>
                          </div>
                          <button
                            onClick={() => navigate(`/scans/${scan.id}`)}
                            className="px-3 py-1 text-sm bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded hover:bg-purple-500/30 transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-400 mb-4">No scans found</p>
                    <button
                      onClick={handleTriggerScan}
                      className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                    >
                      Trigger First Scan
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'findings' && (
              <div>
                {findingsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <LoadingSkeleton key={i} className="h-32" />
                    ))}
                  </div>
                ) : findingsData && findingsData.findings.length > 0 ? (
                  <div className="space-y-4">
                    {findingsData.findings.map((finding) => (
                      <div key={finding.id} className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {finding.severity === 'CRITICAL' && (
                              <span className="px-2 py-1 text-xs font-semibold bg-red-500/20 text-red-400 rounded">
                                CRITICAL
                              </span>
                            )}
                            {finding.severity === 'HIGH' && (
                              <span className="px-2 py-1 text-xs font-semibold bg-orange-500/20 text-orange-400 rounded">
                                HIGH
                              </span>
                            )}
                            {finding.severity === 'MEDIUM' && (
                              <span className="px-2 py-1 text-xs font-semibold bg-yellow-500/20 text-yellow-400 rounded">
                                MEDIUM
                              </span>
                            )}
                            {finding.severity === 'LOW' && (
                              <span className="px-2 py-1 text-xs font-semibold bg-blue-500/20 text-blue-400 rounded">
                                LOW
                              </span>
                            )}
                            <h4 className="text-lg font-semibold text-white">{finding.vulnerabilityType}</h4>
                          </div>
                          <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                            {(finding.confidenceScore * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                        <p className="text-gray-300 mb-3">{finding.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {finding.filePath}
                            {finding.lineNumber && `:${finding.lineNumber}`}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-800 rounded text-xs">
                            {finding.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No findings found</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="text-center py-12">
                <p className="text-gray-400">Payment history will be displayed here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
