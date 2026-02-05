import React from 'react';

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
  disabled?: boolean;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false
}) => {
  const variantClasses = {
    primary: `
      bg-gradient-to-r from-primary via-accent-cyan to-primary
      hover:shadow-glow-blue
      hover:scale-105
    `,
    secondary: `
      bg-gradient-to-r from-accent-purple to-accent-cyan
      hover:shadow-glow-purple
      hover:scale-105
    `,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-6 py-2 rounded-lg font-heading font-semibold
        transition-all duration-300
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
};
