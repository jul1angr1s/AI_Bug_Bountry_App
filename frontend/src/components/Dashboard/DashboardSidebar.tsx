import React from 'react';
import { NetworkStatsCard } from './NetworkStatsCard';
import { LiveActivityFeed } from './LiveActivityFeed';

interface DashboardSidebarProps {
  className?: string;
  stats?: {
    totalProtocols: number;
    activeAgents: number;
    avgResponseTime: number;
  };
  activities?: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
    icon: string;
  }>;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  className = '',
  stats = { totalProtocols: 0, activeAgents: 0, avgResponseTime: 0 },
  activities = []
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Network Stats */}
      <div>
        <h3 className="text-lg font-heading font-semibold text-white mb-4">
          Network Stats
        </h3>
        <div className="space-y-3">
          <NetworkStatsCard
            icon="developer_board"
            label="Total Protocols"
            value={stats.totalProtocols}
            color="blue"
          />
          <NetworkStatsCard
            icon="smart_toy"
            label="Active Agents"
            value={stats.activeAgents}
            color="cyan"
          />
          <NetworkStatsCard
            icon="speed"
            label="Avg Response Time"
            value={`${stats.avgResponseTime}ms`}
            color="green"
          />
        </div>
      </div>

      {/* Live Activity Feed */}
      <LiveActivityFeed activities={activities} />
    </div>
  );
};
