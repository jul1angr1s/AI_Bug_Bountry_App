import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScanProgressTimeline } from '../ScanProgressTimeline';

describe('ScanProgressTimeline', () => {
  describe('Timeline shows all stages in order', () => {
    it('renders all 7 stages in correct order', () => {
      const { container } = render(
        <ScanProgressTimeline currentStep="CLONE" state="RUNNING" />
      );

      const stages = container.querySelectorAll('li');
      expect(stages).toHaveLength(7);

      // Verify aria-labels which contain the full stage titles
      expect(screen.getByLabelText(/Clone Repository/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Compile Contracts/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Deploy Testnet/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Static Analysis/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/AI Deep Analysis/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Proof of Concept/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Submit Report/i)).toBeInTheDocument();
    });
  });

  describe('Timeline displays stage completion state', () => {
    it('displays green checkmark icon with green border for completed stages', () => {
      const { container } = render(
        <ScanProgressTimeline currentStep="COMPILE" state="RUNNING" />
      );

      const stages = container.querySelectorAll('li');
      const cloneStage = stages[0]; // CLONE should be completed

      // Check for checkmark icon
      const icon = cloneStage.querySelector('.material-symbols-outlined');
      expect(icon?.textContent).toBe('check');

      // Check for green text color
      expect(icon?.className).toContain('text-accent-green');

      // Check for green border
      const iconContainer = cloneStage.querySelector('[aria-label*="Clone Repository"]');
      expect(iconContainer?.className).toContain('border-accent-green');
    });

    it('displays "Success" with duration for completed stages', () => {
      render(
        <ScanProgressTimeline
          currentStep="COMPILE"
          state="RUNNING"
          stageDurations={{ CLONE: 5 }}
        />
      );

      expect(screen.getByText(/Success • 5s/i)).toBeInTheDocument();
    });
  });

  describe('Timeline displays active stage', () => {
    it('displays blue spinning sync icon with pulsing animation for active stage', () => {
      const { container } = render(
        <ScanProgressTimeline currentStep="COMPILE" state="RUNNING" />
      );

      const stages = container.querySelectorAll('li');
      const compileStage = stages[1]; // COMPILE should be active

      // Check for sync icon
      const icon = compileStage.querySelector('.material-symbols-outlined');
      expect(icon?.textContent).toBe('sync');

      // Check for blue text color and spin animation
      expect(icon?.className).toContain('text-primary');
      expect(icon?.className).toContain('animate-spin');

      // Check for blue border with glow and pulse
      const iconContainer = compileStage.querySelector('[aria-label*="Compile Contracts"]');
      expect(iconContainer?.className).toContain('border-primary');
      expect(iconContainer?.className).toContain('shadow-glow-blue');
      expect(iconContainer?.className).toContain('animate-pulse');
    });

    it('displays "Processing..." message for active stage without custom message', () => {
      render(<ScanProgressTimeline currentStep="COMPILE" state="RUNNING" />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('displays custom message for active stage with pulsing animation', () => {
      render(
        <ScanProgressTimeline
          currentStep="COMPILE"
          state="RUNNING"
          message="Compiling Solidity contracts..."
        />
      );

      const messageElement = screen.getByText('Compiling Solidity contracts...');
      expect(messageElement).toBeInTheDocument();
      expect(messageElement.className).toContain('text-primary');
      expect(messageElement.className).toContain('animate-pulse');
    });
  });

  describe('Timeline displays pending stages', () => {
    it('displays gray circle icon with gray border for pending stages', () => {
      const { container } = render(
        <ScanProgressTimeline currentStep="COMPILE" state="RUNNING" />
      );

      const stages = container.querySelectorAll('li');
      const deployStage = stages[2]; // DEPLOY should be pending

      // Check for circle icon
      const icon = deployStage.querySelector('.material-symbols-outlined');
      expect(icon?.textContent).toBe('radio_button_unchecked');

      // Check for gray text color
      expect(icon?.className).toContain('text-gray-500');

      // Check for gray border
      const iconContainer = deployStage.querySelector('[aria-label*="Deploy Testnet"]');
      expect(iconContainer?.className).toContain('border-gray-600');
    });

    it('displays "Pending" text for pending stages', () => {
      render(<ScanProgressTimeline currentStep="COMPILE" state="RUNNING" />);

      // Should have multiple "Pending" texts for all pending stages
      const pendingTexts = screen.getAllByText('Pending');
      expect(pendingTexts.length).toBeGreaterThan(0);
    });

    it('applies reduced opacity to pending stages', () => {
      const { container } = render(
        <ScanProgressTimeline currentStep="COMPILE" state="RUNNING" />
      );

      const stages = container.querySelectorAll('li');
      const deployStage = stages[2]; // DEPLOY should be pending

      expect(deployStage.className).toContain('opacity-50');
    });
  });

  describe('Timeline displays failed stage', () => {
    it('displays red X icon with red border for failed stage', () => {
      const { container } = render(
        <ScanProgressTimeline currentStep="DEPLOY" state="FAILED" />
      );

      const stages = container.querySelectorAll('li');
      const deployStage = stages[2]; // DEPLOY should be failed

      // Check for X icon (close)
      const icon = deployStage.querySelector('.material-symbols-outlined');
      expect(icon?.textContent).toBe('close');

      // Check for red text color
      expect(icon?.className).toContain('text-status-critical');

      // Check for red border
      const iconContainer = deployStage.querySelector('[aria-label*="Deploy Testnet"]');
      expect(iconContainer?.className).toContain('border-status-critical');
    });

    it('displays error message for failed stage', () => {
      render(
        <ScanProgressTimeline
          currentStep="DEPLOY"
          state="FAILED"
          message="Failed to fork Ethereum mainnet"
        />
      );

      const errorMessage = screen.getByText('Failed to fork Ethereum mainnet');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage.className).toContain('text-status-critical');
    });

    it('displays default "Stage failed" message when no custom message provided', () => {
      render(<ScanProgressTimeline currentStep="DEPLOY" state="FAILED" />);

      expect(screen.getByText('Stage failed')).toBeInTheDocument();
    });
  });

  describe('Timeline displays stage metadata', () => {
    it('displays block number for completed Deploy stage', () => {
      render(
        <ScanProgressTimeline
          currentStep="ANALYZE"
          state="RUNNING"
          blockNumber="18123456"
          stageDurations={{ CLONE: 3, COMPILE: 12, DEPLOY: 8 }}
        />
      );

      expect(screen.getByText('Forked Block #18123456')).toBeInTheDocument();
    });

    it('displays findings count for completed Static Analysis stage', () => {
      render(
        <ScanProgressTimeline
          currentStep="AI_DEEP_ANALYSIS"
          state="RUNNING"
          findingsCount={23}
          stageDurations={{ CLONE: 3, COMPILE: 12, DEPLOY: 8, ANALYZE: 45 }}
        />
      );

      expect(screen.getByText('Found 23 potential vectors')).toBeInTheDocument();
    });

    it('displays block number for Deploy stage when completed (prior to current step)', () => {
      render(
        <ScanProgressTimeline
          currentStep="ANALYZE"
          state="RUNNING"
          blockNumber="18123456"
        />
      );

      // DEPLOY is completed (prior to ANALYZE), so block number should appear
      expect(screen.getByText('Forked Block #18123456')).toBeInTheDocument();
    });

    it('does not display additional context for pending stages', () => {
      render(
        <ScanProgressTimeline
          currentStep="COMPILE"
          state="RUNNING"
          blockNumber="18123456"
          findingsCount={23}
        />
      );

      // DEPLOY is pending (after COMPILE), so block number should not appear
      expect(screen.queryByText(/Forked Block #/)).not.toBeInTheDocument();

      // ANALYZE is pending, so findings count should not appear
      expect(screen.queryByText(/Found .* potential vectors/)).not.toBeInTheDocument();
    });

    it('does not display findings count for active Static Analysis stage', () => {
      render(
        <ScanProgressTimeline
          currentStep="ANALYZE"
          state="RUNNING"
          findingsCount={23}
        />
      );

      // ANALYZE is active, not completed, so findings count should not appear
      expect(screen.queryByText(/Found .* potential vectors/)).not.toBeInTheDocument();
    });
  });

  describe('Timeline handles out-of-order events', () => {
    it('marks all prior stages as completed when jumping to later stage', () => {
      const { container } = render(
        <ScanProgressTimeline currentStep="AI_DEEP_ANALYSIS" state="RUNNING" />
      );

      const stages = container.querySelectorAll('li');

      // Check that all prior stages show checkmark
      const cloneIcon = stages[0].querySelector('.material-symbols-outlined');
      expect(cloneIcon?.textContent).toBe('check');

      const compileIcon = stages[1].querySelector('.material-symbols-outlined');
      expect(compileIcon?.textContent).toBe('check');

      const deployIcon = stages[2].querySelector('.material-symbols-outlined');
      expect(deployIcon?.textContent).toBe('check');

      const analyzeIcon = stages[3].querySelector('.material-symbols-outlined');
      expect(analyzeIcon?.textContent).toBe('check');

      // Current stage should show sync
      const aiIcon = stages[4].querySelector('.material-symbols-outlined');
      expect(aiIcon?.textContent).toBe('sync');
    });
  });

  describe('Timeline handles completed scan', () => {
    it('marks all stages including SUBMIT as completed when scan completes', () => {
      const { container } = render(
        <ScanProgressTimeline currentStep="SUBMIT" state="COMPLETED" />
      );

      const stages = container.querySelectorAll('li');
      const submitStage = stages[6];

      const submitIcon = submitStage.querySelector('.material-symbols-outlined');
      expect(submitIcon?.textContent).toBe('check');
      expect(submitIcon?.className).toContain('text-accent-green');
    });
  });

  describe('Timeline provides accessible navigation', () => {
    it('uses semantic HTML ordered list structure', () => {
      const { container } = render(
        <ScanProgressTimeline currentStep="COMPILE" state="RUNNING" />
      );

      const orderedList = container.querySelector('ol');
      expect(orderedList).toBeInTheDocument();

      const listItems = orderedList?.querySelectorAll('li');
      expect(listItems).toHaveLength(7);
    });

    it('includes aria-label describing stage state', () => {
      render(<ScanProgressTimeline currentStep="COMPILE" state="RUNNING" />);

      expect(screen.getByLabelText('Clone Repository: Completed')).toBeInTheDocument();
      expect(screen.getByLabelText('Compile Contracts: In Progress')).toBeInTheDocument();
      expect(screen.getByLabelText('Deploy Testnet: Pending')).toBeInTheDocument();
    });

    it('includes aria-live region for state changes', () => {
      const { container } = render(
        <ScanProgressTimeline currentStep="COMPILE" state="RUNNING" />
      );

      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion?.textContent).toContain('Compile Contracts is now in progress');
    });

    it('hides connecting line from screen readers', () => {
      const { container } = render(
        <ScanProgressTimeline currentStep="COMPILE" state="RUNNING" />
      );

      const connectingLine = container.querySelector('.absolute.left-\\[19px\\]');
      expect(connectingLine?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Responsive layout', () => {
    it('renders both desktop and mobile titles with appropriate visibility classes', () => {
      const { container } = render(
        <ScanProgressTimeline currentStep="COMPILE" state="RUNNING" />
      );

      // Find desktop title (hidden on mobile)
      const desktopTitle = container.querySelector('h3.hidden.md\\:block');
      expect(desktopTitle).toBeInTheDocument();

      // Find mobile title (visible on mobile, hidden on desktop)
      const mobileTitle = container.querySelector('h3.block.md\\:hidden');
      expect(mobileTitle).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles undefined progress prop gracefully', () => {
      const { container } = render(
        <ScanProgressTimeline currentStep="COMPILE" state="RUNNING" />
      );

      expect(container).toBeTruthy();
    });

    it('handles empty stageDurations object', () => {
      render(
        <ScanProgressTimeline
          currentStep="ANALYZE"
          state="RUNNING"
          stageDurations={{}}
        />
      );

      // Should not display duration for completed stages
      expect(screen.queryByText(/Success •/)).not.toBeInTheDocument();
    });

    it('renders correctly when starting with first stage', () => {
      const { container } = render(
        <ScanProgressTimeline currentStep="CLONE" state="RUNNING" />
      );

      const stages = container.querySelectorAll('li');
      const cloneIcon = stages[0].querySelector('.material-symbols-outlined');

      expect(cloneIcon?.textContent).toBe('sync');
      expect(cloneIcon?.className).toContain('animate-spin');
    });

    it('renders correctly when on last stage', () => {
      const { container } = render(
        <ScanProgressTimeline currentStep="SUBMIT" state="RUNNING" />
      );

      const stages = container.querySelectorAll('li');

      // All stages except last should be completed
      for (let i = 0; i < 6; i++) {
        const icon = stages[i].querySelector('.material-symbols-outlined');
        expect(icon?.textContent).toBe('check');
      }

      // Last stage should be active
      const submitIcon = stages[6].querySelector('.material-symbols-outlined');
      expect(submitIcon?.textContent).toBe('sync');
    });
  });
});
