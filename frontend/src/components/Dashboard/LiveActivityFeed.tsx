import React from 'react';
import { MaterialIcon } from '@/components/shared/MaterialIcon';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  icon: string;
}

interface LiveActivityFeedProps {
  activities: Activity[];
  isConnected?: boolean;
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  activities,
  isConnected = true
}) => {
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-heading font-semibold text-white">
          Live Activity
        </h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent-green' : 'bg-gray-500'}`} />
          <span className="text-xs text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-navy-700 scrollbar-track-navy-900">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MaterialIcon name="notifications_none" className="text-4xl mb-2" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex gap-3 p-3 rounded-lg bg-navy-900 hover:bg-navy-700
                         transition-colors cursor-pointer group"
            >
              <MaterialIcon
                name={activity.icon}
                className="text-accent-cyan flex-shrink-0 group-hover:scale-110 transition-transform"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{activity.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
