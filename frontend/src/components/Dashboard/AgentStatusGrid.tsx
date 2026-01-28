import AgentStatusCard from './AgentStatusCard';

interface AgentStatusGridProps {
  className?: string;
}

export default function AgentStatusGrid({ className }: AgentStatusGridProps) {
  // Mock data - will be replaced with real data from API
  const agents = [
    {
      id: '1',
      name: 'Protocol Agent',
      type: 'PROTOCOL' as const,
      status: 'ONLINE' as const,
      currentTask: 'Scanning Blocks',
    },
    {
      id: '2',
      name: 'Researcher Agent',
      type: 'RESEARCHER' as const,
      status: 'ONLINE' as const,
      currentTask: 'Exploit Synthesis',
    },
    {
      id: '3',
      name: 'Validator Agent',
      type: 'VALIDATOR' as const,
      status: 'ONLINE' as const,
      currentTask: 'PoC Verification',
    },
  ];

  return (
    <div className={className}>
      <h2 className="text-lg font-semibold text-white mb-4">Agent Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <AgentStatusCard
            key={agent.id}
            name={agent.name}
            type={agent.type}
            status={agent.status}
            currentTask={agent.currentTask}
          />
        ))}
      </div>
    </div>
  );
}
