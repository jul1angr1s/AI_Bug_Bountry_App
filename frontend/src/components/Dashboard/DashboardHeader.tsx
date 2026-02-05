import React, { useState } from 'react';
import { MaterialIcon } from '@/components/shared/MaterialIcon';
import { GradientButton } from '@/components/shared/GradientButton';

export const DashboardHeader: React.FC = () => {
  const [searchExpanded, setSearchExpanded] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-navy-900/80 border-b border-navy-700">
      <div className="px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            <MaterialIcon name="security" className="text-3xl text-primary" />
            <h1 className="text-2xl font-heading font-bold text-white">
              Bug Bounty <span className="text-primary">Dashboard</span>
            </h1>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <MaterialIcon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search protocols, vulnerabilities..."
                className="w-full pl-10 pr-4 py-2 bg-navy-800 border border-navy-700 rounded-lg
                         text-white placeholder-gray-500 focus:outline-none focus:border-primary
                         transition-colors"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Search Icon - Mobile */}
            <button
              className="md:hidden p-2 hover:bg-navy-800 rounded-lg transition-colors"
              onClick={() => setSearchExpanded(!searchExpanded)}
            >
              <MaterialIcon name="search" className="text-xl text-gray-400" />
            </button>

            {/* Notifications */}
            <button className="relative p-2 hover:bg-navy-800 rounded-lg transition-colors">
              <MaterialIcon name="notifications" className="text-xl text-gray-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-accent-cyan rounded-full" />
            </button>

            {/* Account */}
            <button className="p-2 hover:bg-navy-800 rounded-lg transition-colors">
              <MaterialIcon name="account_circle" className="text-xl text-gray-400" />
            </button>
          </div>
        </div>

        {/* Expanded Search - Mobile */}
        {searchExpanded && (
          <div className="mt-4 md:hidden">
            <div className="relative">
              <MaterialIcon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 bg-navy-800 border border-navy-700 rounded-lg
                         text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
