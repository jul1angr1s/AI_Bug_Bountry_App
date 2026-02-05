import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MaterialIcon } from '@/components/shared/MaterialIcon';

// TypeScript Interfaces
export interface LogMessage {
  level: 'INFO' | 'ANALYSIS' | 'ALERT' | 'WARN' | 'DEFAULT';
  message: string;
  timestamp: string;
}

export interface LiveTerminalOutputProps {
  logs?: LogMessage[];
  scanState?: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ABORTED';
}

// Mock log data constant for development
export const MOCK_LOGS: LogMessage[] = [
  {
    level: 'DEFAULT',
    message: '> Initializing AgentSwarm v2.1...',
    timestamp: new Date(Date.now() - 840000).toISOString(),
  },
  {
    level: 'DEFAULT',
    message: '> Loading contract bytecode from 0x1f98431c8ad98523631ae4a59f267346ea31f984...',
    timestamp: new Date(Date.now() - 820000).toISOString(),
  },
  {
    level: 'INFO',
    message: '[INFO] Detected 12 public functions in contract ABI.',
    timestamp: new Date(Date.now() - 800000).toISOString(),
  },
  {
    level: 'DEFAULT',
    message: '> Starting static analysis phase...',
    timestamp: new Date(Date.now() - 780000).toISOString(),
  },
  {
    level: 'INFO',
    message: '[INFO] Detected suspicious logic in function `swap()` line 142.',
    timestamp: new Date(Date.now() - 760000).toISOString(),
  },
  {
    level: 'ANALYSIS',
    message: '[ANALYSIS] Simulating reentrancy attack vector...',
    timestamp: new Date(Date.now() - 740000).toISOString(),
  },
  {
    level: 'DEFAULT',
    message: '  ├── Scenario 1: External call before state update',
    timestamp: new Date(Date.now() - 720000).toISOString(),
  },
  {
    level: 'DEFAULT',
    message: '  ├── Scenario 2: Recursive callback exploitation',
    timestamp: new Date(Date.now() - 700000).toISOString(),
  },
  {
    level: 'DEFAULT',
    message: '  └── Result: Potential reentrancy vulnerability confirmed',
    timestamp: new Date(Date.now() - 680000).toISOString(),
  },
  {
    level: 'ALERT',
    message: '[ALERT] State inconsistency detected!',
    timestamp: new Date(Date.now() - 660000).toISOString(),
  },
  {
    level: 'ALERT',
    message: '[ALERT] Critical vulnerability: Reentrancy in swap() - Severity: HIGH',
    timestamp: new Date(Date.now() - 640000).toISOString(),
  },
  {
    level: 'WARN',
    message: '[WARN] High gas consumption estimate on loop at line 89.',
    timestamp: new Date(Date.now() - 620000).toISOString(),
  },
  {
    level: 'DEFAULT',
    message: '> Continuing deep analysis on 4 remaining functions...',
    timestamp: new Date(Date.now() - 600000).toISOString(),
  },
  {
    level: 'INFO',
    message: '[INFO] Analyzing function `withdraw()` line 201...',
    timestamp: new Date(Date.now() - 580000).toISOString(),
  },
  {
    level: 'ANALYSIS',
    message: '[ANALYSIS] Checking for integer overflow patterns...',
    timestamp: new Date(Date.now() - 560000).toISOString(),
  },
  {
    level: 'INFO',
    message: '[INFO] No overflow vulnerabilities detected in `withdraw()`.',
    timestamp: new Date(Date.now() - 540000).toISOString(),
  },
  {
    level: 'WARN',
    message: '[WARN] Unchecked return value from external call at line 215.',
    timestamp: new Date(Date.now() - 520000).toISOString(),
  },
  {
    level: 'DEFAULT',
    message: '> Generating proof of concept exploit code...',
    timestamp: new Date(Date.now() - 500000).toISOString(),
  },
  {
    level: 'ANALYSIS',
    message: '[ANALYSIS] Building transaction sequence for reentrancy exploit...',
    timestamp: new Date(Date.now() - 480000).toISOString(),
  },
  {
    level: 'INFO',
    message: '[INFO] PoC exploit successfully generated and validated.',
    timestamp: new Date(Date.now() - 460000).toISOString(),
  },
];

// Color mapping for log levels
const LOG_LEVEL_COLORS = {
  INFO: 'text-[#60a5fa]', // Blue
  ANALYSIS: 'text-[#4ade80]', // Green with glow
  ALERT: 'text-[#f87171]', // Red
  WARN: 'text-[#fbbf24]', // Yellow
  DEFAULT: 'text-slate-300 opacity-50', // Gray
};

// Text shadow for ANALYSIS level
const ANALYSIS_GLOW = {
  textShadow: '0 0 5px rgba(74, 222, 128, 0.5)',
};

export const LiveTerminalOutput: React.FC<LiveTerminalOutputProps> = ({
  logs = [],
  scanState = 'RUNNING',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [displayedLogs, setDisplayedLogs] = useState<LogMessage[]>([]);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingLogsRef = useRef<LogMessage[]>([]);

  // Performance optimization: Batch log updates every 100ms
  useEffect(() => {
    if (logs.length === 0) {
      setDisplayedLogs([]);
      return;
    }

    // Add new logs to pending queue
    pendingLogsRef.current = logs;

    // Clear existing timer
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }

    // Batch update after 100ms
    updateTimerRef.current = setTimeout(() => {
      const logsToDisplay = pendingLogsRef.current;
      // Performance optimization: Limit to 500 most recent messages
      const limitedLogs = logsToDisplay.slice(-500);
      setDisplayedLogs(limitedLogs);
    }, 100);

    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, [logs]);

  // Auto-scroll logic
  useEffect(() => {
    if (!scrollContainerRef.current || displayedLogs.length === 0) return;

    const container = scrollContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Auto-scroll if user is at or near bottom (within 50px)
    if (autoScroll || distanceFromBottom <= 50) {
      container.scrollTop = scrollHeight;
    }
  }, [displayedLogs, autoScroll]);

  // Handle scroll event to detect if user scrolled up
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Re-enable auto-scroll if user scrolls to bottom, disable if scrolled up
    setAutoScroll(distanceFromBottom <= 50);
  }, []);

  // Render log message with proper formatting
  const renderLogMessage = (log: LogMessage, index: number) => {
    const colorClass = LOG_LEVEL_COLORS[log.level];
    const style = log.level === 'ANALYSIS' ? ANALYSIS_GLOW : undefined;

    return (
      <div key={index} className={`font-mono text-sm leading-relaxed ${colorClass}`} style={style}>
        {log.message}
      </div>
    );
  };

  const displayLogs = displayedLogs.length > 0 ? displayedLogs : logs;
  const hasLogs = displayLogs.length > 0;
  const showCursor = scanState === 'RUNNING';

  return (
    <div className="w-full bg-[#1a1a1a] rounded-lg overflow-hidden border border-surface-border">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#2a2a2a] border-b border-[#3a3a3a]">
        <div className="flex items-center gap-2">
          {/* macOS-style window control dots */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57] opacity-60" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e] opacity-60" />
            <div className="w-3 h-3 rounded-full bg-[#28c840] opacity-60" />
          </div>
          {/* Terminal title */}
          <div className="flex items-center gap-2 ml-2">
            <MaterialIcon name="terminal" className="text-slate-400 text-base" />
            <span className="text-slate-300 text-sm font-medium">scan_agent_01 — zsh</span>
          </div>
        </div>
      </div>

      {/* Terminal Content Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="bg-[#0c0c0c] p-4 overflow-y-auto"
        style={{ height: '320px' }}
        role="log"
        aria-live="polite"
        aria-label="Terminal output showing scan agent logs"
      >
        {!hasLogs ? (
          <div className="text-slate-400 font-mono text-sm opacity-60">
            Awaiting agent output...
          </div>
        ) : (
          <>
            {displayLogs.map((log, index) => renderLogMessage(log, index))}
            {/* Blinking cursor for active terminal */}
            {showCursor && (
              <div className="inline-block ml-1">
                <span className="text-slate-300 font-mono text-sm animate-pulse">_</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
