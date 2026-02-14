import { PaymentStats } from '../../hooks/usePaymentStats';
import { useState } from 'react';

interface PayoutChartProps {
  stats?: PaymentStats;
  onSeverityClick?: (severity: string) => void;
  isLoading?: boolean;
}

interface SeverityData {
  label: string;
  amount: number;
  color: string;
  percentage: number;
}

export function PayoutChart({ onSeverityClick, isLoading }: PayoutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-6 animate-pulse"></div>
        <div className="grid grid-cols-4 h-[200px] items-end gap-4 px-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full bg-slate-200 dark:bg-slate-700 rounded-t-lg animate-pulse" style={{ height: `${30 + i * 20}%` }}></div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate severity distribution
  // For demo purposes, using fixed distribution based on new amounts
  const severityData: SeverityData[] = [
    { label: 'Critical', amount: 10, color: 'from-red-900 to-red-500', percentage: 100 },
    { label: 'High', amount: 5, color: 'from-orange-900 to-orange-500', percentage: 50 },
    { label: 'Medium', amount: 3, color: 'from-yellow-900 to-yellow-500', percentage: 30 },
    { label: 'Low', amount: 1, color: 'from-blue-900 to-blue-500', percentage: 10 },
  ];

  const maxAmount = Math.max(...severityData.map(d => d.amount));

  return (
    <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Payout Distribution by Severity</h3>
          <p className="text-slate-500 text-sm">Current bounty amounts per severity level</p>
        </div>
      </div>

      <div className="grid grid-cols-4 h-[200px] items-end gap-4 px-2">
        {severityData.map((data, index) => {
          const height = (data.amount / maxAmount) * 100;
          const isHovered = hoveredIndex === index;

          return (
            <div
              key={data.label}
              className="flex flex-col items-center gap-2 h-full justify-end group cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onSeverityClick?.(data.label.toUpperCase())}
            >
              {/* Tooltip */}
              <div
                className={`text-xs font-bold text-accent-gold transition-opacity mb-1 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}
              >
                ${data.amount} USDC
              </div>

              {/* Bar */}
              <div
                className={`w-full bg-gradient-to-t ${data.color} rounded-t-lg relative hover:brightness-110 transition-all ${
                  isHovered ? 'scale-105' : ''
                }`}
                style={{ height: `${height}%` }}
              ></div>

              {/* Label */}
              <p className="text-xs font-medium text-slate-400 mt-2">{data.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Click a bar to filter payments by severity
        </p>
      </div>
    </div>
  );
}
