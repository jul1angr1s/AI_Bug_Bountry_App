import React from 'react';
import { GlowCard } from '@/components/shared/GlowCard';
import { MaterialIcon } from '@/components/shared/MaterialIcon';
import { PulseIndicator } from '@/components/shared/PulseIndicator';
import { AGENT_DESCRIPTIONS } from '@/lib/utils';

interface Agent {
  id: string;
  type: 'Protocol' | 'Researcher' | 'Validator' | 'Payment';
  status: 'active' | 'idle' | 'error';
  scansCompleted?: number;
  uptime?: string;
}

interface ModernAgentCardProps {
  agent: Agent;
}

const agentIcons: Record<string, string> = {
  Protocol: 'developer_board',
  Researcher: 'bug_report',
  Validator: 'verified',
  Payment: 'payments',
};

const agentColors: Record<string, 'cyan' | 'purple' | 'blue' | 'green'> = {
  Protocol: 'blue',
  Researcher: 'cyan',
  Validator: 'green',
  Payment: 'purple',
};

export const ModernAgentCard: React.FC<ModernAgentCardProps> = ({ agent }) => {
  const glowColor = agentColors[agent.type] || 'blue';
  const iconName = agentIcons[agent.type] || 'smart_toy';

  const progress = agent.scansCompleted ? Math.min((agent.scansCompleted / 100) * 100, 100) : 0;

  return (
    <GlowCard glowColor={glowColor} className="relative overflow-hidden group">
      {/* Background Icon */}
      <MaterialIcon
        name={iconName}
        className="absolute -right-4 -bottom-4 text-[120px] text-navy-700/20
                   group-hover:text-primary/10 transition-colors duration-300"
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <PulseIndicator status={agent.status} />
            <h3 className="font-heading font-semibold text-lg text-white">
              {agent.type} Agent
            </h3>
          </div>
          <div className={`
            px-2 py-1 rounded text-xs font-medium
            ${agent.status === 'active' ? 'bg-accent-green/20 text-accent-green' : ''}
            ${agent.status === 'idle' ? 'bg-gray-500/20 text-gray-400' : ''}
            ${agent.status === 'error' ? 'bg-status-critical/20 text-status-critical' : ''}
          `}>
            {agent.status.toUpperCase()}
          </div>
        </div>

        {/* Progress Bar */}
        {agent.scansCompleted !== undefined && (
          <div className="mb-3">
            <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-cyan to-primary
                           transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Description */}
        {AGENT_DESCRIPTIONS[agent.type] && (
          <p className="text-xs text-gray-400 mb-2 line-clamp-2">
            {AGENT_DESCRIPTIONS[agent.type].description}
          </p>
        )}

        {/* Capability Tags */}
        {AGENT_DESCRIPTIONS[agent.type]?.capabilities && (
          <div className="flex flex-wrap gap-1 mb-3">
            {AGENT_DESCRIPTIONS[agent.type].capabilities.slice(0, 3).map((cap) => (
              <span
                key={cap}
                className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-navy-700/60 text-gray-400 border border-navy-600/40"
              >
                {cap}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex justify-between items-center text-sm">
          {agent.scansCompleted !== undefined && (
            <span className="text-gray-400">
              {agent.scansCompleted} scans
            </span>
          )}
          {agent.uptime && (
            <span className="text-gray-400">
              Uptime: {agent.uptime}
            </span>
          )}
        </div>
      </div>
    </GlowCard>
  );
};
