import { useParams } from 'react-router-dom';
import { useScan, useScanFindings } from '../hooks/useScans';
import { useScanProgressLive } from '../hooks/useScanProgressLive';
import { useScanLogs } from '../hooks/useScanLogs';
import { ScanProgressTimeline } from '../components/scans/modern/ScanProgressTimeline';
import { LiveTerminalOutput } from '../components/scans/modern/LiveTerminalOutput';
import VulnerabilityChart from '../components/scans/modern/VulnerabilityChart';
import { FindingsList } from '../components/scans/modern/FindingsList';
import { ScanDashboardHeader } from '../components/scans/modern/ScanDashboardHeader';

export function ScanDashboardModern() {
  const { id } = useParams<{ id: string }>();
  const scanId = id!;

  // Fetch scan metadata
  const { data: scan, isLoading: scanLoading, isError: scanError } = useScan(scanId);

  // Fetch scan findings
  const {
    data: findingsData,
    isLoading: findingsLoading,
  } = useScanFindings(scanId);

  // Subscribe to real-time progress updates
  const progress = useScanProgressLive(scanId);
  const progressError = progress.error;

  // Subscribe to real-time scan logs for terminal output
  const logs = useScanLogs(scanId, scan?.state);

  // Loading state
  if (scanLoading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
          <p className="mt-4 text-slate-400">Loading scan data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (scanError || !scan) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-status-critical">error</span>
          <h2 className="mt-4 text-2xl font-bold text-white">Failed to load scan</h2>
          <p className="mt-2 text-slate-400">Scan ID: {scanId}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const findings = findingsData?.findings || [];

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Page Header */}
      <div className="border-b border-surface-border bg-background-dark/95 backdrop-blur">
        <div className="px-4 py-6 md:px-10 lg:px-20 max-w-[1600px] mx-auto">
          <ScanDashboardHeader scan={scan} />
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 py-8 md:px-10 lg:px-20 max-w-[1600px] mx-auto">
        {/* Grid Layout: Sidebar (4 cols) + Content (8 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar: Progress Timeline */}
          <div className="lg:col-span-4">
            <div className="bg-surface-dark rounded-xl border border-surface-border p-6 shadow-lg sticky top-8">
              <h3 className="text-white text-lg font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">timelapse</span>
                Scan Progress
              </h3>

              {/* Progress Summary */}
              {progress && (
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
                        Current Stage
                      </p>
                      <p className="text-white font-medium">
                        {progress.currentStep?.replace(/_/g, ' ') || 'Initializing'}
                      </p>
                    </div>
                    {progress.progress !== undefined && (
                      <p className="text-primary font-bold text-xl">{progress.progress}%</p>
                    )}
                  </div>

                  {progress.progress !== undefined && (
                    <div className="h-2 w-full bg-surface-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Timeline */}
              <ScanProgressTimeline
                currentStep={progress?.currentStep || scan.currentStep || 'CLONE'}
                state={scan.state}
                progress={progress?.progress}
                message={progress?.message}
              />
            </div>
          </div>

          {/* Right Content: Terminal, Chart, Findings */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Live Terminal Output */}
            <LiveTerminalOutput logs={logs} scanState={scan.state as 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ABORTED'} />

            {/* Vulnerability Chart */}
            {findingsLoading ? (
              <div className="bg-surface-dark rounded-xl border border-surface-border p-6 shadow-lg h-48 flex items-center justify-center">
                <div className="text-slate-400">Loading vulnerability data...</div>
              </div>
            ) : (
              <VulnerabilityChart findings={findings} />
            )}

            {/* Findings List */}
            {findingsLoading ? (
              <div className="bg-surface-dark rounded-xl border border-surface-border p-6 shadow-lg h-64 flex items-center justify-center">
                <div className="text-slate-400">Loading findings...</div>
              </div>
            ) : (
              <FindingsList findings={findings} />
            )}
          </div>
        </div>

        {/* WebSocket Connection Status Indicator */}
        {progressError && (
          <div className="fixed bottom-4 right-4 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-sm text-red-500">Connection lost</span>
          </div>
        )}
      </main>
    </div>
  );
}
