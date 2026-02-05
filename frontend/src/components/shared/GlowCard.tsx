import React from 'react';

interface GlowCardProps {
  children: React.ReactNode;
  glowColor?: 'cyan' | 'purple' | 'blue' | 'green';
  className?: string;
}

export const GlowCard: React.FC<GlowCardProps> = ({
  children,
  glowColor = 'blue',
  className = ''
}) => {
  const glowClasses = {
    cyan: 'hover:shadow-glow-cyan',
    purple: 'hover:shadow-glow-purple',
    blue: 'hover:shadow-glow-blue',
    green: 'hover:shadow-glow-green',
  };

  return (
    <div
      className={`
        bg-navy-800 border border-navy-700 rounded-lg p-6
        transition-all duration-300
        ${glowClasses[glowColor]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
