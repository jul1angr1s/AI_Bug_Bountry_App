import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!walletConnectProjectId) {
  console.warn('[wagmi] VITE_WALLETCONNECT_PROJECT_ID is not set. WalletConnect will not work.');
}

// Configure Base Sepolia (matches existing USDC deployment)
const connectors = [
  injected(), // MetaMask
  coinbaseWallet({ appName: 'Thunder Security' }),
];

if (walletConnectProjectId) {
  connectors.push(walletConnect({ projectId: walletConnectProjectId }));
}

export const config = createConfig({
  chains: [baseSepolia],
  connectors,
  transports: {
    [baseSepolia.id]: http(),
  },
});
