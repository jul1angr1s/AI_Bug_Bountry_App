import React from 'react';
import { MaterialIcon } from '@/components/shared/MaterialIcon';

export interface Finding {
  id: string;
  vulnerabilityType: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  description: string;
  filePath: string;
  lineNumber?: number;
  confidenceScore: number; // 0-100
  createdAt: string;
}

export interface FindingCardProps {
  finding: Finding;
}

export const FindingCard: React.FC<FindingCardProps> = ({ finding }) => {
  // Get severity badge configuration
  const getSeverityConfig = (severity: Finding['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          color: 'bg-red-500/10 text-red-500 ring-1 ring-red-500/30',
          label: 'CRITICAL',
        };
      case 'HIGH':
        return {
          color: 'bg-orange-500/10 text-orange-500 ring-1 ring-orange-500/30',
          label: 'HIGH',
        };
      case 'MEDIUM':
        return {
          color: 'bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/30',
          label: 'MEDIUM',
        };
      case 'LOW':
        return {
          color: 'bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/30',
          label: 'LOW',
        };
      case 'INFO':
        return {
          color: 'bg-gray-500/10 text-gray-500 ring-1 ring-gray-500/30',
          label: 'INFO',
        };
      default:
        return {
          color: 'bg-gray-500/10 text-gray-500 ring-1 ring-gray-500/30',
          label: severity,
        };
    }
  };

  // Get confidence bar gradient based on score
  const getConfidenceGradient = (score: number) => {
    if (score < 60) {
      return 'bg-gradient-to-r from-yellow-500 to-orange-500';
    } else if (score < 80) {
      return 'bg-gradient-to-r from-blue-500 to-cyan-500';
    } else {
      return 'bg-gradient-to-r from-green-400 to-green-600';
    }
  };

  // Extract CWE code from vulnerability type (e.g., "CWE-896: Reentrancy" -> "CWE-896")
  const extractCWECode = (vulnType: string) => {
    const cweMatch = vulnType.match(/CWE-\d+/);
    return cweMatch ? cweMatch[0] : null;
  };

  // Get title from vulnerability type (remove CWE prefix if present)
  const getTitle = (vulnType: string) => {
    return vulnType.replace(/^CWE-\d+:\s*/, '');
  };

  const severityConfig = getSeverityConfig(finding.severity);
  const cweCode = extractCWECode(finding.vulnerabilityType);
  const title = getTitle(finding.vulnerabilityType);

  return (
    <div
      className="bg-surface-dark border border-surface-border rounded-lg p-4 hover:bg-[#1f2b3e] transition-all duration-200"
      aria-label={`${severityConfig.label}: ${title}`}
      role="article"
    >
      {/* Desktop Layout: Horizontal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left Section: Metadata */}
        <div className="flex-1 min-w-0">
          {/* Severity Badge and CWE Code */}
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${severityConfig.color}`}
            >
              {severityConfig.label}
            </span>
            {cweCode && (
              <span className="text-xs text-gray-400 font-mono">{cweCode}</span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-white mb-1 truncate">
            {title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-400 line-clamp-2 mb-2">
            {finding.description}
          </p>

          {/* File Path */}
          {finding.filePath && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MaterialIcon name="code" className="text-sm" />
              <span className="font-mono">
                {finding.filePath}
                {finding.lineNumber && `:${finding.lineNumber}`}
              </span>
            </div>
          )}
        </div>

        {/* Mobile Border Separator */}
        <div className="md:hidden border-t border-surface-border" />

        {/* Right Section: AI Confidence Meter */}
        <div className="flex items-center gap-3">
          <div className="w-full md:w-32">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">AI Confidence</span>
              <span className="text-xs font-bold text-white">
                {finding.confidenceScore}%
              </span>
            </div>
            <div className="w-full bg-navy-900 rounded-full h-2 overflow-hidden border border-navy-700/50">
              <div
                className={`h-full transition-all duration-300 ${getConfidenceGradient(finding.confidenceScore)}`}
                style={{ width: `${finding.confidenceScore}%` }}
              />
            </div>
          </div>

          {/* Expand Button */}
          <button
            className="p-1 hover:bg-surface-border rounded transition-colors"
            aria-label="Expand finding details"
          >
            <MaterialIcon name="chevron_right" className="text-gray-400 text-xl" />
          </button>
        </div>
      </div>
    </div>
  );
};
