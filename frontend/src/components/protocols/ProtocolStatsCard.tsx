import React from 'react';
import { MaterialIcon } from '@/components/shared/MaterialIcon';

interface ProtocolStatsCardProps {
  icon: string;
  label: string;
  value: string;
  growth: string;
  growthColor: 'green' | 'red' | 'gray';
}

export const ProtocolStatsCard: React.FC<ProtocolStatsCardProps> = ({
  icon,
  label,
  value,
  growth,
  growthColor,
}) => {
  const growthColorClass = {
    green: 'text-green-400',
    red: 'text-red-400',
    gray: 'text-gray-400',
  }[growthColor];

  return (
    <div className="bg-[#162030] border border-[#2f466a] rounded-xl p-6 hover:border-[#3f567a] transition-all">
      <div className="flex items-center gap-2 text-[#8ea6cc] mb-3">
        <MaterialIcon name={icon} className="text-xl" />
        <span className="text-sm font-medium">{label}</span>
      </div>

      <div className="mb-2">
        <div className="text-3xl font-bold text-white">{value}</div>
      </div>

      <div className={`text-sm font-medium ${growthColorClass}`}>
        {growth}
      </div>
    </div>
  );
};
