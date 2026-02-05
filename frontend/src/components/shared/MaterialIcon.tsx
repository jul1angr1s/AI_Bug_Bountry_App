import React from 'react';

interface MaterialIconProps {
  name: string;
  className?: string;
  onClick?: () => void;
}

export const MaterialIcon: React.FC<MaterialIconProps> = ({ name, className = '', onClick }) => {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {name}
    </span>
  );
};
