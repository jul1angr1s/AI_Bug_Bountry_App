import React from 'react';
import { PulseIndicator } from '../shared/PulseIndicator';

interface StatusFilterChipsProps {
  selectedStatus: string | null;
  onStatusChange: (status: string | null) => void;
}

type StatusOption = {
  value: string | null;
  label: string;
  indicator?: 'green' | 'blue-pulse' | 'yellow';
};

const statusOptions: StatusOption[] = [
  { value: null, label: 'All Status' },
  { value: 'ACTIVE', label: 'Active', indicator: 'green' },
  { value: 'PENDING', label: 'Pending', indicator: 'blue-pulse' },
  { value: 'PAUSED', label: 'Paused', indicator: 'yellow' },
];

export const StatusFilterChips: React.FC<StatusFilterChipsProps> = ({
  selectedStatus,
  onStatusChange,
}) => {
  const renderStatusIndicator = (indicator?: 'green' | 'blue-pulse' | 'yellow') => {
    if (!indicator) return null;

    if (indicator === 'blue-pulse') {
      return <PulseIndicator status="active" size="sm" />;
    }

    const colorClass = {
      green: 'bg-accent-green',
      yellow: 'bg-yellow-500',
    }[indicator];

    return <div className={`w-2 h-2 rounded-full ${colorClass}`} />;
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
      {statusOptions.map((option) => {
        const isSelected = selectedStatus === option.value;

        return (
          <button
            key={option.label}
            onClick={() => onStatusChange(option.value)}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all
              flex items-center gap-2 whitespace-nowrap
              ${
                isSelected
                  ? 'bg-primary text-white'
                  : 'bg-[#21314a] border border-[#2f466a] text-gray-300 hover:bg-[#2f466a]'
              }
            `}
          >
            {renderStatusIndicator(option.indicator)}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
