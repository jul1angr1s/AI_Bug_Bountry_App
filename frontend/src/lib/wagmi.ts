import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// Configure Base Sepolia (matches existing USDC deployment)
export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(), // MetaMask
    walletConnect({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
    }),
    coinbaseWallet({ appName: 'Thunder Security' }),
  ],
  transports: {
    [baseSepolia.id]: http(),
  },
});
