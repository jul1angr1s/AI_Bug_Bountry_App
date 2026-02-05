import React from 'react';
import { MaterialIcon } from '@/components/shared/MaterialIcon';

interface NetworkStatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  color?: 'cyan' | 'purple' | 'green' | 'blue';
}

export const NetworkStatsCard: React.FC<NetworkStatsCardProps> = ({
  icon,
  label,
  value,
  color = 'cyan'
}) => {
  const colorClasses = {
    cyan: 'text-accent-cyan',
    purple: 'text-accent-purple',
    green: 'text-accent-green',
    blue: 'text-primary',
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-navy-800 border border-navy-700 rounded-lg">
      <div className={`${colorClasses[color]}`}>
        <MaterialIcon name={icon} className="text-3xl" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-xl font-heading font-bold text-white">{value}</p>
      </div>
    </div>
  );
};
