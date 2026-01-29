import { useState } from 'react';
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

  const handleSort = (field: keyof Vulnerability) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

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
        <p className="text-center text-gray-400">No vulnerabilities found</p>
      </div>
    );
  }

  return (
    <div className="bg-navy-800 rounded-lg border border-navy-900 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-navy-900">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('title')}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  Vulnerability
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('severity')}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  Severity
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Protocol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Bounty
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-900">
            {sortedVulnerabilities.map((vuln) => (
              <tr key={vuln.id} className="hover:bg-navy-900/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm text-white font-medium max-w-md">
                    {vuln.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(vuln.discoveredAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <SeverityBadge severity={vuln.severity} />
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-300">{vuln.status}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-300">{vuln.protocol}</span>
                </td>
                <td className="px-6 py-4">
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
