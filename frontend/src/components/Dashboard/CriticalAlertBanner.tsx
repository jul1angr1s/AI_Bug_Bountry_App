import { AlertTriangle, X } from 'lucide-react';

interface CriticalAlertBannerProps {
  title: string;
  message: string;
  onDismiss?: () => void;
  onViewReport?: () => void;
}

export default function CriticalAlertBanner({ title, message, onDismiss, onViewReport }: CriticalAlertBannerProps) {
  return (
    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-500 mb-1">{title}</h3>
          <p className="text-sm text-gray-300">{message}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onViewReport && (
            <button
              onClick={onViewReport}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              View Report
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-gray-400 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
