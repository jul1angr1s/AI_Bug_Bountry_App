import { User } from 'lucide-react';

interface UserProfileProps {
  role: string;
  walletAddress?: string;
}

export default function UserProfile({ role, walletAddress }: UserProfileProps) {
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex items-center gap-3 p-4 border-t border-navy-900">
      <div
        className="w-10 h-10 rounded-full bg-navy-900 flex items-center justify-center"
        data-testid="user-icon"
      >
        <User className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{role}</p>
        {walletAddress && (
          <p className="text-xs text-gray-400 truncate">
            {truncateAddress(walletAddress)}
          </p>
        )}
      </div>
    </div>
  );
}
