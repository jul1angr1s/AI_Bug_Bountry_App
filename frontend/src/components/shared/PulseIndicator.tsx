import React from 'react';

interface PulseIndicatorProps {
  status: 'active' | 'idle' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

export const PulseIndicator: React.FC<PulseIndicatorProps> = ({
  status,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const statusClasses = {
    active: 'bg-accent-green animate-pulse',
    idle: 'bg-gray-500',
    error: 'bg-status-critical animate-pulse',
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <div className={`rounded-full ${sizeClasses[size]} ${statusClasses[status]}`} />
      {status === 'active' && (
        <div className={`absolute rounded-full ${sizeClasses[size]} bg-accent-green opacity-30 animate-ping`} />
      )}
    </div>
  );
};
