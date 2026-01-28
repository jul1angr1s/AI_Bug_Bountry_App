import { User } from 'lucide-react';

export default function UserProfile() {
  // Mock data - will be replaced with actual auth context
  const walletAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const truncated = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  return (
    <div className="border-t border-navy-800 p-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-navy-800 flex items-center justify-center">
          <User className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-300">Security Ops</p>
          <p className="text-xs text-gray-500 truncate" title={walletAddress}>
            {truncated}
          </p>
        </div>
      </div>
    </div>
  );
}
