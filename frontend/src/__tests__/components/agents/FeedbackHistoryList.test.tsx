import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FeedbackHistoryList from '../../../components/agents/FeedbackHistoryList';
import type { AgentFeedback } from '../../../types/dashboard';

const mockFeedbacks: AgentFeedback[] = [
  {
    id: 'f1',
    researcherAgentId: 'a1',
    validatorAgentId: 'a2',
    validationId: 'v1',
    findingId: 'find1',
    feedbackType: 'CONFIRMED_CRITICAL' as const,
    onChainFeedbackId: '0xfeedback1',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'f2',
    researcherAgentId: 'a1',
    validatorAgentId: 'a2',
    validationId: 'v2',
    findingId: 'find2',
    feedbackType: 'REJECTED' as const,
    onChainFeedbackId: null,
    createdAt: '2026-01-02T00:00:00Z',
  },
];

describe('FeedbackHistoryList', () => {
  it('renders feedback table headers', () => {
    render(<FeedbackHistoryList feedbacks={mockFeedbacks} isLoading={false} />);

    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Validator')).toBeInTheDocument();
    expect(screen.getByText('Finding')).toBeInTheDocument();
    expect(screen.getByText('On-Chain ID')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
  });

  it('renders CONFIRMED_CRITICAL badge', () => {
    render(<FeedbackHistoryList feedbacks={mockFeedbacks} isLoading={false} />);

    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('renders REJECTED badge', () => {
    render(<FeedbackHistoryList feedbacks={mockFeedbacks} isLoading={false} />);

    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('shows empty state when no feedback', () => {
    render(<FeedbackHistoryList feedbacks={[]} isLoading={false} />);

    expect(screen.getByText('No feedback events found.')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading=true', () => {
    const { container } = render(
      <FeedbackHistoryList feedbacks={[]} isLoading={true} />
    );

    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });
});
