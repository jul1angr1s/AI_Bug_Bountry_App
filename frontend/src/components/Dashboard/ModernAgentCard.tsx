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

const agentThemes: Record<
  string,
  {
    glow: 'cyan' | 'purple' | 'blue' | 'green';
    badge: string;
    iconShell: string;
    bar: string;
    halo: string;
  }
> = {
  Protocol: {
    glow: 'blue',
    badge: 'bg-primary/15 text-blue-200 border-blue-400/40',
    iconShell: 'bg-primary/20 border-blue-300/30 text-blue-200',
    bar: 'from-primary via-blue-400 to-accent-cyan',
    halo: 'from-primary/20 via-primary/10 to-transparent',
  },
  Researcher: {
    glow: 'cyan',
    badge: 'bg-accent-cyan/15 text-cyan-100 border-accent-cyan/40',
    iconShell: 'bg-accent-cyan/20 border-accent-cyan/35 text-cyan-100',
    bar: 'from-accent-cyan via-cyan-300 to-blue-300',
    halo: 'from-accent-cyan/20 via-accent-cyan/10 to-transparent',
  },
  Validator: {
    glow: 'green',
    badge: 'bg-accent-green/15 text-emerald-100 border-accent-green/40',
    iconShell: 'bg-accent-green/20 border-accent-green/35 text-emerald-100',
    bar: 'from-accent-green via-emerald-300 to-cyan-300',
    halo: 'from-accent-green/20 via-accent-green/10 to-transparent',
  },
  Payment: {
    glow: 'purple',
    badge: 'bg-accent-purple/15 text-fuchsia-100 border-accent-purple/40',
    iconShell: 'bg-accent-purple/20 border-accent-purple/35 text-fuchsia-100',
    bar: 'from-accent-purple via-fuchsia-300 to-violet-300',
    halo: 'from-accent-purple/20 via-accent-purple/10 to-transparent',
  },
};

export const ModernAgentCard: React.FC<ModernAgentCardProps> = ({ agent }) => {
  const theme = agentThemes[agent.type] || agentThemes.Protocol;
  const iconName = agentIcons[agent.type] || 'smart_toy';
  const details = AGENT_DESCRIPTIONS[agent.type];
  const health = agent.status === 'active' ? 96 : agent.status === 'idle' ? 74 : 32;

  const activity = agent.scansCompleted ? Math.min((agent.scansCompleted / 100) * 100, 100) : 6;

  const statusStyles = {
    active: 'border-accent-green/50 bg-accent-green/15 text-emerald-100',
    idle: 'border-gray-500/40 bg-gray-500/15 text-gray-200',
    error: 'border-status-critical/50 bg-status-critical/15 text-red-200',
  };

  return (
    <GlowCard glowColor={theme.glow} className="relative overflow-hidden group min-h-[270px] p-5 sm:p-6">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${theme.halo}`} />
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/5 blur-2xl opacity-40 group-hover:opacity-60 transition-opacity" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 h-10 w-10 rounded-xl border ${theme.iconShell} flex items-center justify-center`}>
              <MaterialIcon name={iconName} className="text-[22px]" />
            </div>
            <div>
              <p className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${theme.badge}`}>
                {agent.type}
              </p>
              <h3 className="mt-1 font-heading font-semibold text-lg leading-tight text-white">
                {details?.label || `${agent.type} Agent`}
              </h3>
            </div>
          </div>

          <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[agent.status]}`}>
            <PulseIndicator status={agent.status} size="sm" />
            {agent.status.toUpperCase()}
          </div>
        </div>

        <p className="text-sm text-gray-300/90 leading-relaxed min-h-[44px]">
          {details?.description}
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-400">
              <span>Live Activity</span>
              <span>{Math.round(activity)}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-navy-700/90 border border-navy-600/60">
              <div
                className={`h-full bg-gradient-to-r ${theme.bar} transition-all duration-700`}
                style={{ width: `${activity}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-navy-600/60 bg-navy-900/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Scans</p>
              <p className="mt-1 font-heading text-lg leading-none text-white">{agent.scansCompleted ?? 0}</p>
            </div>
            <div className="rounded-lg border border-navy-600/60 bg-navy-900/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Health</p>
              <p className="mt-1 font-heading text-lg leading-none text-white">{health}%</p>
            </div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-700/80">
            <div className={`h-full w-1/3 bg-gradient-to-r ${theme.bar} animate-pulse`} />
          </div>
        </div>

        {details?.capabilities && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {details.capabilities.slice(0, 3).map((cap) => (
              <span
                key={cap}
                className="rounded-md border border-navy-600/70 bg-navy-900/55 px-2 py-1 text-[10px] font-medium text-gray-300"
              >
                {cap}
              </span>
            ))}
          </div>
        )}
      </div>
    </GlowCard>
  );
};
