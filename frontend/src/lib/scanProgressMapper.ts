import { LogMessage } from '@/components/scans/modern/LiveTerminalOutput';

/**
 * Maps scan progress messages to terminal log format
 */
export function mapScanProgressToLogs(
  currentStep: string,
  message: string,
  timestamp: string
): LogMessage {
  // Map different scan steps to appropriate log levels
  const stepLevelMap: Record<string, LogMessage['level']> = {
    CLONE: 'INFO',
    COMPILE: 'INFO',
    DEPLOY: 'INFO',
    ANALYZE: 'ANALYSIS',
    AI_DEEP_ANALYSIS: 'ANALYSIS',
    PROOF_GENERATION: 'ANALYSIS',
    SUBMIT: 'INFO',
  };

  const lowerMessage = message.toLowerCase();

  // Detect special messages for appropriate log levels
  if (lowerMessage.includes('error') || lowerMessage.includes('failed')) {
    return { level: 'ALERT', message: `[ERROR] ${message}`, timestamp };
  }
  
  if (lowerMessage.includes('warning')) {
    return { level: 'WARN', message: `[WARN] ${message}`, timestamp };
  }
  
  if (lowerMessage.includes('found') || lowerMessage.includes('detected') || lowerMessage.includes('discovered')) {
    return { level: 'ALERT', message: `[ALERT] ${message}`, timestamp };
  }

  if (lowerMessage.includes('vulnerability') || lowerMessage.includes('issue')) {
    return { level: 'ALERT', message: `[ALERT] ${message}`, timestamp };
  }

  if (lowerMessage.includes('analyzing') || lowerMessage.includes('analysis') || lowerMessage.includes('simulating')) {
    return { level: 'ANALYSIS', message: `[ANALYSIS] ${message}`, timestamp };
  }

  if (lowerMessage.includes('success') || lowerMessage.includes('complete')) {
    return { level: 'INFO', message: `[INFO] ${message}`, timestamp };
  }

  const level = stepLevelMap[currentStep] || 'DEFAULT';
  return { level, message: `> ${message}`, timestamp };
}

/**
 * Formats step name for display
 */
export function formatStepName(step: string): string {
  const stepNames: Record<string, string> = {
    CLONE: 'Cloning Repository',
    COMPILE: 'Compiling Contracts',
    DEPLOY: 'Deploying to Testnet',
    ANALYZE: 'Running Static Analysis',
    AI_DEEP_ANALYSIS: 'AI Deep Analysis',
    PROOF_GENERATION: 'Generating Proof of Concept',
    SUBMIT: 'Submitting Results',
  };

  return stepNames[step] || step;
}
