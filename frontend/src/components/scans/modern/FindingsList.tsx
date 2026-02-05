import React, { useMemo } from 'react';
import { FindingCard, Finding } from './FindingCard';
import { MaterialIcon } from '@/components/shared/MaterialIcon';

export interface FindingsListProps {
  findings: Finding[];
  onExportReport?: () => void;
}

export const FindingsList: React.FC<FindingsListProps> = ({ findings, onExportReport }) => {
  // Sort findings by severity then timestamp
  const sortedFindings = useMemo(() => {
    const severityOrder: Record<Finding['severity'], number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
      INFO: 4,
    };

    return [...findings].sort((a, b) => {
      // First, sort by severity
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      // Then, sort by timestamp (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [findings]);

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MaterialIcon name="warning" className="text-xl text-yellow-500" />
          <h2 className="text-lg font-semibold text-white font-['Space_Grotesk']">
            Real-time Findings
          </h2>
        </div>

        {onExportReport && findings.length > 0 && (
          <button
            onClick={onExportReport}
            className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-surface-border rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:border-primary/50 transition-all"
          >
            <MaterialIcon name="download" className="text-lg" />
            <span>Export Report</span>
          </button>
        )}
      </div>

      {/* Findings List */}
      {sortedFindings.length > 0 ? (
        <div className="flex flex-col gap-3" role="list">
          {sortedFindings.map((finding) => (
            <div key={finding.id} role="listitem">
              <FindingCard finding={finding} />
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-surface-dark border border-surface-border rounded-lg">
          <MaterialIcon name="shield_with_heart" className="text-6xl text-gray-600 mb-4" />
          <p className="text-gray-400 text-center">
            No vulnerabilities detected yet
          </p>
          <p className="text-gray-500 text-sm text-center mt-1">
            The scan is in progress. Findings will appear here as they are discovered.
          </p>
        </div>
      )}
    </div>
  );
};
