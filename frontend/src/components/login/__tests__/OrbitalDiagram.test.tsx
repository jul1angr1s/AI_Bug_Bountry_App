import { fireEvent, render, screen } from '@testing-library/react';
import { OrbitalDiagram } from '@/components/login/OrbitalDiagram';

function getNodeButton(label: string) {
  return screen.getByRole('button', { name: `${label} helper` });
}

describe('OrbitalDiagram', () => {
  it('shows helper content when a node receives focus', () => {
    render(<OrbitalDiagram />);
    const protocolButton = getNodeButton('Protocol');
    const tooltipId = protocolButton.getAttribute('aria-controls');

    fireEvent.focus(protocolButton);

    expect(protocolButton).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(tooltipId!)).toHaveClass('opacity-100');
  });

  it('toggles helper visibility on click/tap', () => {
    render(<OrbitalDiagram />);
    const researcherButton = getNodeButton('Researcher');

    fireEvent.click(researcherButton);
    expect(researcherButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(researcherButton);
    expect(researcherButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps only one helper open at a time', () => {
    render(<OrbitalDiagram />);
    const protocolButton = getNodeButton('Protocol');
    const paymentButton = getNodeButton('Payment');

    fireEvent.click(protocolButton);
    expect(protocolButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(paymentButton);
    expect(paymentButton).toHaveAttribute('aria-expanded', 'true');
    expect(protocolButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes active helper on outside pointer down', () => {
    render(<OrbitalDiagram />);
    const validatorButton = getNodeButton('Validator');

    fireEvent.click(validatorButton);
    expect(validatorButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.pointerDown(document.body);
    expect(validatorButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes active helper on Escape key', () => {
    render(<OrbitalDiagram />);
    const paymentButton = getNodeButton('Payment');

    fireEvent.click(paymentButton);
    expect(paymentButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(paymentButton).toHaveAttribute('aria-expanded', 'false');
  });
});
