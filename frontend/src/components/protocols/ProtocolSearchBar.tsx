import React, { useState, useEffect } from 'react';
import { MaterialIcon } from '@/components/shared/MaterialIcon';

interface ProtocolSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const ProtocolSearchBar: React.FC<ProtocolSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search protocols...',
}) => {
  const [internalValue, setInternalValue] = useState(value);

  // Debounce the onChange callback with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(internalValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [internalValue, onChange]);

  // Sync internal value with external value changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  return (
    <div className="relative w-full max-w-md">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <MaterialIcon name="search" className="text-[#8ea6cc] text-xl" />
      </div>

      <input
        type="text"
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#162030] border border-[#2f466a] rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-[#8ea6cc] focus:outline-none focus:border-primary transition-colors"
      />
    </div>
  );
};
