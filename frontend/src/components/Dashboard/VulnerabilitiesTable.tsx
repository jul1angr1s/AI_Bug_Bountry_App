import { ExternalLink, ChevronRight } from 'lucide-react';
import SeverityBadge from '../shared/SeverityBadge';
import StatusBadge from '../shared/StatusBadge';
import { truncateAddress } from '@/lib/utils';
import { Vulnerability } from '@/types/dashboard';

interface VulnerabilitiesTableProps {
  className?: string;
}

export default function VulnerabilitiesTable({ className }: VulnerabilitiesTableProps) {
  // Mock data - will be replaced with real data from API
  const vulnerabilities: Vulnerability[] = [
    {
      id: '1',
      protocolId: 'thunder-loan',
      title: 'Oracle Price Manipulation',
      description: 'Manipulation of underlying asset price in pool',
      severity: 'CRITICAL',
      status: 'PAID',
      researcher: { address: '0x7099...79C8' },
      discoveredAt: '2026-01-28T15:00:00Z',
      txHash: '0xabc123',
      bountyAmount: '5000',
    },
    {
      id: '2',
      protocolId: 'thunder-loan',
      title: 'Reentrancy Guard Check',
      description: 'Standard validation for reentrancy',
      severity: 'LOW',
      status: 'CONFIRMED',
      researcher: { address: 'System' },
      discoveredAt: '2026-01-28T14:30:00Z',
    },
  ];

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Confirmed Vulnerabilities</h2>
        <button className="text-sm text-blue-500 hover:text-blue-400 transition-colors">
          View All Scans
        </button>
      </div>

      <div className="bg-navy-900 border border-navy-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-navy-800/50 border-b border-navy-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Vulnerability
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Severity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Researcher
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-800">
            {vulnerabilities.map((vuln) => (
              <tr key={vuln.id} className="hover:bg-navy-800/30 transition-colors">
                <td className="px-4 py-4">
                  <div>
                    <div className="text-sm font-medium text-white">{vuln.title}</div>
                    <div className="text-xs text-gray-400 mt-1">{vuln.description}</div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <SeverityBadge severity={vuln.severity} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-navy-800 flex items-center justify-center text-xs text-gray-400">
                      {vuln.researcher.address[0]}
                    </div>
                    <span className="text-sm text-gray-300 font-mono">
                      {typeof vuln.researcher.address === 'string' && vuln.researcher.address.startsWith('0x')
                        ? truncateAddress(vuln.researcher.address)
                        : vuln.researcher.address}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={vuln.status} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    {vuln.txHash && (
                      <button className="text-blue-500 hover:text-blue-400 transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                    <button className="text-gray-400 hover:text-gray-300 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
