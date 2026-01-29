export interface NavItem {
  label: string;
  path: string;
  icon?: string;
}

export interface UserProfile {
  role: string;
  walletAddress?: string;
}
