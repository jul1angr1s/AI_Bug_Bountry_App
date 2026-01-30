import { useState, useCallback, KeyboardEvent } from 'react';
import { ArrowUpDown } from 'lucide-react';
import SeverityBadge from '@/components/shared/SeverityBadge';
import type { Vulnerability } from '@/types/dashboard';

interface VulnerabilitiesTableProps {
  vulnerabilities: Vulnerability[];
}

export default function VulnerabilitiesTable({
  vulnerabilities,
}: VulnerabilitiesTableProps) {
  const [sortField, setSortField] = useState<keyof Vulnerability | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = useCallback((field: keyof Vulnerability) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField, sortDirection]);

  const handleSortKeyDown = useCallback((e: KeyboardEvent, field: keyof Vulnerability) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSort(field);
    }
  }, [handleSort]);

  const sortedVulnerabilities = [...vulnerabilities].sort((a, b) => {
    if (!sortField) return 0;

    const aValue = a[sortField];
    const bValue = b[sortField];

    if (!aValue || !bValue) return 0;
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  if (vulnerabilities.length === 0) {
    return (
      <div className="bg-navy-800 rounded-lg p-8 border border-navy-900">
        <p className="text-center text-gray-400" role="status">No vulnerabilities found</p>
      </div>
    );
  }

  return (
    <div className="bg-navy-800 rounded-lg border border-navy-900 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" role="table" aria-label="Vulnerabilities">
          <thead>
            <tr className="border-b border-navy-900">
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('title')}
                  onKeyDown={(e) => handleSortKeyDown(e, 'title')}
                  className="flex items-center gap-1 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-navy-800 rounded px-1"
                  aria-label={`Sort by vulnerability ${sortField === 'title' ? (sortDirection === 'asc' ? 'descending' : 'ascending') : 'descending'}`}
                  aria-sort={sortField === 'title' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Vulnerability
                  <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                </button>
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('severity')}
                  onKeyDown={(e) => handleSortKeyDown(e, 'severity')}
                  className="flex items-center gap-1 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-navy-800 rounded px-1"
                  aria-label={`Sort by severity ${sortField === 'severity' ? (sortDirection === 'asc' ? 'descending' : 'ascending') : 'descending'}`}
                  aria-sort={sortField === 'severity' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Severity
                  <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                </button>
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Protocol
              </th>
              <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Bounty
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-900">
            {sortedVulnerabilities.map((vuln) => (
              <tr
                key={vuln.id}
                className="hover:bg-navy-900/50 transition-colors focus-within:bg-navy-900/50"
                tabIndex={0}
                role="row"
              >
                <td className="px-4 sm:px-6 py-4" role="cell">
                  <div className="text-sm text-white font-medium max-w-md">
                    {vuln.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(vuln.discoveredAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4" role="cell">
                  <SeverityBadge severity={vuln.severity} />
                </td>
                <td className="px-4 sm:px-6 py-4" role="cell">
                  <span className="text-sm text-gray-300">{vuln.status}</span>
                </td>
                <td className="hidden md:table-cell px-4 sm:px-6 py-4" role="cell">
                  <span className="text-sm text-gray-300">{vuln.protocol}</span>
                </td>
                <td className="hidden sm:table-cell px-4 sm:px-6 py-4" role="cell">
                  <span className="text-sm font-semibold text-primary">
                    {vuln.bounty || '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
