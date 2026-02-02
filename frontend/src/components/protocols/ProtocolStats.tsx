import { Activity, AlertTriangle, DollarSign, Users } from 'lucide-react';
import { LoadingSkeleton } from '../shared/LoadingSkeleton';

interface ProtocolStatsProps {
  stats: {
    totalScans: number;
    vulnerabilitiesFound: number;
    totalPaid: string;
    activeResearchers: number;
  };
  isLoading?: boolean;
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  gradientClass: string;
  iconColorClass: string;
}

function StatItem({
  icon,
  label,
  value,
  gradientClass,
  iconColorClass,
}: StatItemProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg p-6 border border-gray-800 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-gray-700 hover:shadow-lg ${gradientClass}`}
    >
      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at top right, rgba(255, 255, 255, 0.1), transparent)',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`p-2 rounded-lg backdrop-blur-sm ${iconColorClass}`}
          >
            {icon}
          </div>
        </div>

        <p className="text-gray-400 text-sm font-medium mb-2">{label}</p>
        <p className="text-3xl font-bold text-white break-words">{value}</p>
      </div>
    </div>
  );
}

export default function ProtocolStats({ stats, isLoading = false }: ProtocolStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-6"
          >
            <LoadingSkeleton className="h-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatItem
        icon={<Activity className="w-5 h-5 text-blue-400" />}
        label="Total Scans"
        value={stats.totalScans}
        gradientClass="bg-gradient-to-br from-blue-900/20 to-blue-800/10 hover:from-blue-900/30 hover:to-blue-800/20"
        iconColorClass="bg-blue-900/30 border border-blue-800/50"
      />

      <StatItem
        icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
        label="Vulnerabilities Found"
        value={stats.vulnerabilitiesFound}
        gradientClass="bg-gradient-to-br from-red-900/20 to-orange-800/10 hover:from-red-900/30 hover:to-orange-800/20"
        iconColorClass="bg-red-900/30 border border-red-800/50"
      />

      <StatItem
        icon={<DollarSign className="w-5 h-5 text-green-400" />}
        label="Total Paid"
        value={stats.totalPaid}
        gradientClass="bg-gradient-to-br from-green-900/20 to-emerald-800/10 hover:from-green-900/30 hover:to-emerald-800/20"
        iconColorClass="bg-green-900/30 border border-green-800/50"
      />

      <StatItem
        icon={<Users className="w-5 h-5 text-purple-400" />}
        label="Active Researchers"
        value={stats.activeResearchers}
        gradientClass="bg-gradient-to-br from-purple-900/20 to-purple-800/10 hover:from-purple-900/30 hover:to-purple-800/20"
        iconColorClass="bg-purple-900/30 border border-purple-800/50"
      />
    </div>
  );
}
