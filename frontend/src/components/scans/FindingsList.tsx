import React from 'react';
import { Finding } from '../../lib/api';
import SeverityBadge from '../shared/SeverityBadge';

interface FindingsListProps {
  findings: Finding[];
  scanId: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  VALIDATED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  DUPLICATE: 'bg-gray-100 text-gray-800',
};

export const FindingsList: React.FC<FindingsListProps> = ({ findings, scanId: _scanId }) => {
  if (findings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <p className="text-gray-500">No vulnerabilities found in this scan</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Findings ({findings.length})
        </h3>
      </div>
      
      <div className="divide-y">
        {findings.map((finding) => (
          <div key={finding.id} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <SeverityBadge severity={finding.severity} />
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      STATUS_COLORS[finding.status] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {finding.status}
                  </span>
                </div>
                
                <h4 className="text-md font-medium text-gray-900 mb-1">
                  {finding.vulnerabilityType}
                </h4>
                
                <p className="text-sm text-gray-600 mb-2">
                  {finding.description}
                </p>
                
                <div className="flex items-center text-sm text-gray-500 space-x-4">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                    {finding.filePath}:{finding.lineNumber || '?'}
                  </span>
                  <span>
                    Confidence: {Math.round(finding.confidenceScore * 100)}%
                  </span>
                </div>
              </div>

              {/* Proofs Section */}
              {finding.proofs && finding.proofs.length > 0 && (
                <div className="ml-4 flex-shrink-0">
                  <div className="text-xs text-gray-500 mb-1">
                    {finding.proofs.length} proof(s)
                  </div>
                  <div className="flex space-x-1">
                    {finding.proofs.map((proof) => (
                      <span
                        key={proof.id}
                        className="w-2 h-2 rounded-full bg-blue-500"
                        title={`Proof ${proof.id.slice(0, 8)} - ${proof.status}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface ScanResultsPageProps {
  scanId: string;
}

export const ScanResultsPage: React.FC<ScanResultsPageProps> = ({ scanId }) => {
  const [findings, setFindings] = React.useState<Finding[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadFindings = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/v1/scans/${scanId}/findings`);
        if (!response.ok) {
          throw new Error('Failed to load findings');
        }
        const data = await response.json();
        setFindings(data.findings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadFindings();
  }, [scanId]);

  if (loading) {
    return <div className="p-8 text-center">Loading findings...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        Error loading findings: {error}
      </div>
    );
  }

  return <FindingsList findings={findings} scanId={scanId} />;
};
