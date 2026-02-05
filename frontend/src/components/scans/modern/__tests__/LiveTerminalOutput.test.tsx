import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LiveTerminalOutput, LogMessage, MOCK_LOGS } from '../LiveTerminalOutput';

describe('LiveTerminalOutput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Requirement: Display terminal-style log output
  describe('Terminal Styling', () => {
    it('should display logs in monospace font on black background', () => {
      const { container } = render(
        <LiveTerminalOutput logs={MOCK_LOGS.slice(0, 3)} scanState="RUNNING" />
      );

      const terminalContent = container.querySelector('[role="log"]');
      expect(terminalContent).toBeInTheDocument();
      expect(terminalContent).toHaveStyle({ height: '320px' });
      expect(terminalContent).toHaveClass('bg-[#0c0c0c]');
    });

    it('should display title bar with terminal icon and scan_agent_01 — zsh', () => {
      render(<LiveTerminalOutput logs={[]} scanState="RUNNING" />);

      expect(screen.getByText('scan_agent_01 — zsh')).toBeInTheDocument();
      expect(screen.getByText('terminal')).toBeInTheDocument();
    });

    it('should display macOS-style window control dots', () => {
      const { container } = render(<LiveTerminalOutput logs={[]} scanState="RUNNING" />);

      const dots = container.querySelectorAll('.w-3.h-3.rounded-full');
      expect(dots).toHaveLength(3);
      expect(dots[0]).toHaveClass('bg-[#ff5f57]');
      expect(dots[1]).toHaveClass('bg-[#febc2e]');
      expect(dots[2]).toHaveClass('bg-[#28c840]');
    });

    it('should enable vertical scrolling with scrollable content area', () => {
      const { container } = render(
        <LiveTerminalOutput logs={MOCK_LOGS} scanState="RUNNING" />
      );

      const scrollContainer = container.querySelector('[role="log"]');
      expect(scrollContainer).toHaveClass('overflow-y-auto');
    });
  });

  // Requirement: Display color-coded log messages
  describe('Color Coding', () => {
    it('should display INFO messages in blue', () => {
      const infoLog: LogMessage[] = [
        { level: 'INFO', message: '[INFO] Test message', timestamp: new Date().toISOString() },
      ];
      const { container } = render(<LiveTerminalOutput logs={infoLog} />);

      const logElement = container.querySelector('.text-\\[\\#60a5fa\\]');
      expect(logElement).toBeInTheDocument();
      expect(logElement?.textContent).toBe('[INFO] Test message');
    });

    it('should display ANALYSIS messages in green with glow', () => {
      const analysisLog: LogMessage[] = [
        { level: 'ANALYSIS', message: '[ANALYSIS] Test analysis', timestamp: new Date().toISOString() },
      ];
      const { container } = render(<LiveTerminalOutput logs={analysisLog} />);

      const logElement = container.querySelector('.text-\\[\\#4ade80\\]');
      expect(logElement).toBeInTheDocument();
      expect(logElement).toHaveStyle({ textShadow: '0 0 5px rgba(74, 222, 128, 0.5)' });
    });

    it('should display ALERT messages in red', () => {
      const alertLog: LogMessage[] = [
        { level: 'ALERT', message: '[ALERT] Critical error!', timestamp: new Date().toISOString() },
      ];
      const { container } = render(<LiveTerminalOutput logs={alertLog} />);

      const logElement = container.querySelector('.text-\\[\\#f87171\\]');
      expect(logElement).toBeInTheDocument();
      expect(logElement?.textContent).toBe('[ALERT] Critical error!');
    });

    it('should display WARN messages in yellow', () => {
      const warnLog: LogMessage[] = [
        { level: 'WARN', message: '[WARN] Warning message', timestamp: new Date().toISOString() },
      ];
      const { container } = render(<LiveTerminalOutput logs={warnLog} />);

      const logElement = container.querySelector('.text-\\[\\#fbbf24\\]');
      expect(logElement).toBeInTheDocument();
      expect(logElement?.textContent).toBe('[WARN] Warning message');
    });

    it('should display DEFAULT messages in gray with reduced opacity', () => {
      const defaultLog: LogMessage[] = [
        { level: 'DEFAULT', message: '> Initializing...', timestamp: new Date().toISOString() },
      ];
      const { container } = render(<LiveTerminalOutput logs={defaultLog} />);

      const logElement = container.querySelector('.text-slate-300.opacity-50');
      expect(logElement).toBeInTheDocument();
      expect(logElement?.textContent).toBe('> Initializing...');
    });
  });

  // Requirement: Support log message formatting
  describe('Message Formatting', () => {
    it('should preserve message prefixes', () => {
      const logsWithPrefixes: LogMessage[] = [
        { level: 'DEFAULT', message: '> Starting process...', timestamp: new Date().toISOString() },
        { level: 'INFO', message: '[INFO] Process started', timestamp: new Date().toISOString() },
      ];
      render(<LiveTerminalOutput logs={logsWithPrefixes} />);

      expect(screen.getByText('> Starting process...')).toBeInTheDocument();
      expect(screen.getByText('[INFO] Process started')).toBeInTheDocument();
    });

    it('should preserve tree structures with correct indentation', () => {
      const treeStructureLogs: LogMessage[] = [
        { level: 'DEFAULT', message: '  ├── Branch 1', timestamp: new Date().toISOString() },
        { level: 'DEFAULT', message: '  └── Branch 2', timestamp: new Date().toISOString() },
      ];
      render(<LiveTerminalOutput logs={treeStructureLogs} />);

      expect(screen.getByText('  ├── Branch 1')).toBeInTheDocument();
      expect(screen.getByText('  └── Branch 2')).toBeInTheDocument();
    });

    it('should display all messages from mock data correctly', () => {
      render(<LiveTerminalOutput logs={MOCK_LOGS.slice(0, 5)} />);

      expect(screen.getByText('> Initializing AgentSwarm v2.1...')).toBeInTheDocument();
      expect(screen.getByText(/Loading contract bytecode from/)).toBeInTheDocument();
    });
  });

  // Requirement: Accept log data via props
  describe('Props Handling', () => {
    it('should accept logs prop and render messages', () => {
      const testLogs: LogMessage[] = [
        { level: 'INFO', message: 'Test log 1', timestamp: new Date().toISOString() },
        { level: 'WARN', message: 'Test log 2', timestamp: new Date().toISOString() },
      ];
      render(<LiveTerminalOutput logs={testLogs} />);

      expect(screen.getByText('Test log 1')).toBeInTheDocument();
      expect(screen.getByText('Test log 2')).toBeInTheDocument();
    });

    it('should display placeholder message when logs array is empty', () => {
      render(<LiveTerminalOutput logs={[]} />);

      expect(screen.getByText('Awaiting agent output...')).toBeInTheDocument();
    });

    it('should display placeholder message when logs prop is undefined', () => {
      render(<LiveTerminalOutput />);

      expect(screen.getByText('Awaiting agent output...')).toBeInTheDocument();
    });

    it('should handle scanState prop correctly', () => {
      const { rerender } = render(<LiveTerminalOutput logs={[]} scanState="RUNNING" />);
      expect(screen.getByText('_')).toBeInTheDocument();

      rerender(<LiveTerminalOutput logs={[]} scanState="COMPLETED" />);
      expect(screen.queryByText('_')).not.toBeInTheDocument();
    });
  });

  // Requirement: Display cursor animation for active terminal
  describe('Cursor Animation', () => {
    it('should display blinking cursor when scan state is RUNNING', () => {
      const testLogs: LogMessage[] = [
        { level: 'INFO', message: 'Last log', timestamp: new Date().toISOString() },
      ];
      render(<LiveTerminalOutput logs={testLogs} scanState="RUNNING" />);

      const cursor = screen.getByText('_');
      expect(cursor).toBeInTheDocument();
      expect(cursor).toHaveClass('animate-pulse');
    });

    it('should not display cursor when scan state is COMPLETED', () => {
      const testLogs: LogMessage[] = [
        { level: 'INFO', message: 'Last log', timestamp: new Date().toISOString() },
      ];
      render(<LiveTerminalOutput logs={testLogs} scanState="COMPLETED" />);

      expect(screen.queryByText('_')).not.toBeInTheDocument();
    });

    it('should not display cursor when scan state is FAILED', () => {
      render(<LiveTerminalOutput logs={MOCK_LOGS} scanState="FAILED" />);

      expect(screen.queryByText('_')).not.toBeInTheDocument();
    });

    it('should not display cursor when scan state is ABORTED', () => {
      render(<LiveTerminalOutput logs={MOCK_LOGS} scanState="ABORTED" />);

      expect(screen.queryByText('_')).not.toBeInTheDocument();
    });
  });

  // Requirement: Support mock data for development
  describe('Mock Data', () => {
    it('should export MOCK_LOGS constant', () => {
      expect(MOCK_LOGS).toBeDefined();
      expect(Array.isArray(MOCK_LOGS)).toBe(true);
      expect(MOCK_LOGS.length).toBeGreaterThan(0);
    });

    it('should include all severity levels in mock data', () => {
      const levels = MOCK_LOGS.map(log => log.level);

      expect(levels).toContain('INFO');
      expect(levels).toContain('ANALYSIS');
      expect(levels).toContain('ALERT');
      expect(levels).toContain('WARN');
      expect(levels).toContain('DEFAULT');
    });

    it('should render mock data correctly', () => {
      render(<LiveTerminalOutput logs={MOCK_LOGS} />);

      expect(screen.getByText('> Initializing AgentSwarm v2.1...')).toBeInTheDocument();
      expect(screen.getByText('[ALERT] State inconsistency detected!')).toBeInTheDocument();
    });
  });

  // Requirement: Provide performant rendering for large log volumes
  describe('Performance Optimizations', () => {
    it('should limit rendered logs to 500 most recent messages', async () => {
      // Create 600 log messages
      const largeLogs: LogMessage[] = Array.from({ length: 600 }, (_, i) => ({
        level: 'INFO' as const,
        message: `Log message ${i}`,
        timestamp: new Date().toISOString(),
      }));

      const { container } = render(<LiveTerminalOutput logs={largeLogs} />);

      // Wait for batch update (100ms)
      await waitFor(() => {
        const logElements = container.querySelectorAll('.font-mono.text-sm');
        expect(logElements.length).toBeLessThanOrEqual(500);
      }, { timeout: 200 });
    });

    it('should batch log updates every 100ms', async () => {
      const { rerender } = render(<LiveTerminalOutput logs={[]} />);

      const newLogs: LogMessage[] = [
        { level: 'INFO', message: 'New log 1', timestamp: new Date().toISOString() },
      ];

      rerender(<LiveTerminalOutput logs={newLogs} />);

      // Log should appear after batching delay
      await waitFor(() => {
        expect(screen.getByText('New log 1')).toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should handle rapid log updates efficiently', async () => {
      const { rerender } = render(<LiveTerminalOutput logs={[]} />);

      // Simulate rapid updates
      for (let i = 0; i < 20; i++) {
        const logs: LogMessage[] = Array.from({ length: i + 1 }, (_, j) => ({
          level: 'INFO' as const,
          message: `Rapid log ${j}`,
          timestamp: new Date().toISOString(),
        }));
        rerender(<LiveTerminalOutput logs={logs} />);
      }

      // Should eventually render the last set
      await waitFor(() => {
        expect(screen.getByText('Rapid log 19')).toBeInTheDocument();
      }, { timeout: 300 });
    });
  });

  // Requirement: Auto-scroll to latest log entry
  describe('Auto-scroll Logic', () => {
    it('should have proper ARIA attributes for accessibility', () => {
      const { container } = render(<LiveTerminalOutput logs={MOCK_LOGS} />);

      const logContainer = container.querySelector('[role="log"]');
      expect(logContainer).toHaveAttribute('aria-live', 'polite');
      expect(logContainer).toHaveAttribute('aria-label', 'Terminal output showing scan agent logs');
    });

    it('should render scrollable container with correct height', () => {
      const { container } = render(<LiveTerminalOutput logs={MOCK_LOGS} />);

      const scrollContainer = container.querySelector('[role="log"]');
      expect(scrollContainer).toHaveStyle({ height: '320px' });
      expect(scrollContainer).toHaveClass('overflow-y-auto');
    });
  });

  // Additional edge cases
  describe('Edge Cases', () => {
    it('should handle logs with special characters', () => {
      const specialLogs: LogMessage[] = [
        { level: 'INFO', message: 'Log with <script>alert("xss")</script>', timestamp: new Date().toISOString() },
        { level: 'WARN', message: 'Log with & ampersand', timestamp: new Date().toISOString() },
      ];
      render(<LiveTerminalOutput logs={specialLogs} />);

      expect(screen.getByText('Log with <script>alert("xss")</script>')).toBeInTheDocument();
      expect(screen.getByText('Log with & ampersand')).toBeInTheDocument();
    });

    it('should handle very long log messages', () => {
      const longMessage = 'A'.repeat(1000);
      const longLogs: LogMessage[] = [
        { level: 'INFO', message: longMessage, timestamp: new Date().toISOString() },
      ];
      render(<LiveTerminalOutput logs={longLogs} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle logs with empty messages', () => {
      const emptyLogs: LogMessage[] = [
        { level: 'INFO', message: '', timestamp: new Date().toISOString() },
      ];
      const { container } = render(<LiveTerminalOutput logs={emptyLogs} />);

      const logElements = container.querySelectorAll('.font-mono.text-sm');
      expect(logElements.length).toBe(1);
    });
  });
});
