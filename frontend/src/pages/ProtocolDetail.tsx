import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Github, ExternalLink, Play, FileText, Shield, AlertCircle, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useProtocol, useProtocolRealtime } from '../hooks/useProtocol';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchScans, fetchScanFindings, type FundingState } from '../lib/api';
import ProtocolStats from '../components/protocols/ProtocolStats';
import { LoadingSkeleton } from '../components/shared/LoadingSkeleton';
import StatusBadge from '../components/shared/StatusBadge';
import RegistrationProgress from '../components/protocols/RegistrationProgress';
import ScanProgressLive from '../components/protocols/ScanProgressLive';
import FundingGate from '../components/protocols/FundingGate';
import { useProtocolRegistrationProgress } from '../hooks/useProtocolRegistrationProgress';
import ScanConfirmationModal from '../components/protocols/ScanConfirmationModal';
import { useLatestScan } from '../hooks/useLatestScan';
import { useScanProgressLive } from '../hooks/useScanProgressLive';
import { LiveTerminalOutput, LogMessage } from '../components/scans/modern/LiveTerminalOutput';
import { MaterialIcon } from '../components/shared/MaterialIcon';
import { mapScanProgressToLogs } from '../lib/scanProgressMapper';

type TabType = 'overview' | 'scans' | 'findings' | 'payments';

export default function ProtocolDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showTerminal, setShowTerminal] = useState(false);
  const [scanLogs, setScanLogs] = useState<LogMessage[]>([]);
  const [showScanModal, setShowScanModal] = useState(false);

  const { data: protocol, isLoading, isError, error } = useProtocol(id || '');
  useProtocolRealtime(id || '');
  const { data: latestScan } = useLatestScan(id || '');
  const progressState = useScanProgressLive(latestScan?.id || null);

  // SSE registration progress - bridges completion to React Query refetch
  const registrationProgress = useProtocolRegistrationProgress(
    protocol?.status === 'PENDING' ? id || null : null
  );

  // When SSE reports registration COMPLETED or FAILED, poll until protocol data catches up
  // COMPLETED: polls until status becomes ACTIVE (worker sets status to ACTIVE on success)
  // FAILED: polls until registrationState becomes FAILED (status stays PENDING since it's not in the enum)
  useEffect(() => {
    const sseTerminal = registrationProgress.isCompleted || registrationProgress.isFailed;
    const backendCaughtUp =
      protocol?.status !== 'PENDING' || protocol?.registrationState === 'FAILED';

    if (sseTerminal && !backendCaughtUp) {
      queryClient.invalidateQueries({ queryKey: ['protocol', id] });

      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['protocol', id] });
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [registrationProgress.isCompleted, registrationProgress.isFailed, protocol?.status, protocol?.registrationState, queryClient, id]);

  // Derived state for funding
  const canRequestScan = protocol?.canRequestScan || false;
  const needsFunding =
    protocol?.status === 'ACTIVE' &&
    protocol?.fundingState !== 'FUNDED';

  // Handle funding completion - refresh protocol data and open scan modal
  const handleFundingComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['protocol', id] });
    // Open scan confirmation modal after funding is complete
    setShowScanModal(true);
  }, [queryClient, id]);

  // Handle scan started - refresh data and navigate
  const handleScanStarted = useCallback((_scanId: string) => {
    queryClient.invalidateQueries({ queryKey: ['protocol', id] });
    queryClient.invalidateQueries({ queryKey: ['scans', id] });
    // Stay on page and switch to scans tab
    setActiveTab('scans');
  }, [queryClient, id]);

  // Convert scan progress messages to terminal logs
  useEffect(() => {
    if (latestScan?.state === 'RUNNING' && progressState.message && progressState.currentStep) {
      const log = mapScanProgressToLogs(
        progressState.currentStep,
        progressState.message,
        new Date().toISOString()
      );
      
      // Avoid duplicate logs
      setScanLogs((prev) => {
        const lastLog = prev[prev.length - 1];
        if (lastLog && lastLog.message === log.message) {
          return prev;
        }
        return [...prev, log];
      });
    }
  }, [latestScan?.state, progressState.message, progressState.currentStep]);

  // Clear logs when scan completes or changes
  useEffect(() => {
    if (!latestScan || latestScan.state !== 'RUNNING') {
      setScanLogs([]);
    }
  }, [latestScan?.id, latestScan?.state]);

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
    if (!id) return;

    // If protocol is funded, show confirmation modal
    if (canRequestScan) {
      setShowScanModal(true);
    } else {
      // Show message that funding is required
      alert('Please fund your bounty pool before requesting a scan.');
    }
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
              {canRequestScan ? (
                <button
                  onClick={handleTriggerScan}
                  className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Request Researchers Scanning
                </button>
              ) : needsFunding ? (
                <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg flex items-center gap-2">
                  <MaterialIcon name="account_balance_wallet" className="text-lg" />
                  Funding Required
                </div>
              ) : (
                <button
                  disabled
                  className="px-4 py-2 bg-gray-700 border border-gray-600 text-gray-500 rounded-lg cursor-not-allowed flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Request Scan
                </button>
              )}
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

                {/* Registration Failed */}
                {protocol.status === 'PENDING' && (protocol.registrationState === 'FAILED' || registrationProgress.isFailed) && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-6 mb-6">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-red-400" />
                      <div>
                        <h4 className="text-base font-semibold text-red-400">Registration failed</h4>
                        <p className="text-sm text-gray-400 mt-1">
                          {protocol.failureReason || registrationProgress.message || 'An error occurred during registration. Please try again.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Progress Card */}
                {protocol.status === 'PENDING' && protocol.registrationState !== 'FAILED' && !registrationProgress.isCompleted && !registrationProgress.isFailed && (
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-6 mb-6">
                    <h4 className="text-base font-semibold text-white mb-4">Registration Progress</h4>
                    <RegistrationProgress protocolId={id || ''} />
                  </div>
                )}

                {/* Transition state: SSE completed but protocol data hasn't refetched yet */}
                {protocol.status === 'PENDING' && protocol.registrationState !== 'FAILED' && registrationProgress.isCompleted && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-6 mb-6">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-green-400 animate-spin" />
                      <div>
                        <h4 className="text-base font-semibold text-green-400">Registration complete!</h4>
                        <p className="text-sm text-gray-400 mt-1">Preparing your bounty pool...</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Funding Gate - Show when protocol is ACTIVE but not FUNDED */}
                {needsFunding && (
                  <div className="mb-6">
                    <FundingGate
                      protocolId={protocol.id}
                      onChainProtocolId={protocol.onChainProtocolId}
                      bountyPoolAmount={protocol.bountyPoolAmount || protocol.minimumBountyRequired}
                      minimumBountyRequired={protocol.minimumBountyRequired}
                      currentFundingState={protocol.fundingState as FundingState | null}
                      onFundingComplete={handleFundingComplete}
                    />
                  </div>
                )}

                {latestScan && (latestScan.state === 'RUNNING' || latestScan.state === 'PENDING') && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-6 mb-6">
                    <h4 className="text-base font-semibold text-white mb-4">Scan in Progress</h4>
                    <ScanProgressLive scanId={latestScan.id} />
                  </div>
                )}

                {/* Live Terminal Output */}
                {latestScan && latestScan.state === 'RUNNING' && scanLogs.length > 0 && (
                  <div className="bg-[#0f1723] border border-gray-800 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <MaterialIcon name="terminal" className="text-xl text-green-400" />
                        <h4 className="text-base font-semibold text-white">Live Scan Output</h4>
                        {progressState.isConnected && (
                          <span className="flex items-center gap-1.5 text-xs text-green-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Live
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setShowTerminal(!showTerminal)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                      >
                        <MaterialIcon name={showTerminal ? 'expand_less' : 'expand_more'} className="text-lg" />
                        <span>{showTerminal ? 'Hide' : 'Show'} Terminal</span>
                      </button>
                    </div>
                    
                    {showTerminal && (
                      <LiveTerminalOutput
                        logs={scanLogs}
                        scanState={latestScan.state as 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ABORTED'}
                      />
                    )}
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

      {/* Scan Confirmation Modal */}
      <ScanConfirmationModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        protocolId={protocol.id}
        protocolName={protocol.contractName || 'Unknown Protocol'}
        bountyPoolAmount={protocol.bountyPoolAmount || protocol.minimumBountyRequired}
        onChainBalance={protocol.totalBountyPool || 0}
        bountyTerms={protocol.bountyTerms}
        branch={protocol.branch}
        onScanStarted={handleScanStarted}
      />
    </div>
  );
}
