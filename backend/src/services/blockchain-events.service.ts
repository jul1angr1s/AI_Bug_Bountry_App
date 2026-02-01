import {
  getEventListenerService,
  handleBountyReleasedEvent,
} from './event-listener.service.js';
import { contractAddresses } from '../blockchain/config.js';
import BountyPoolABI from '../blockchain/abis/BountyPool.json' with { type: 'json' };

/**
 * Initialize blockchain event listeners
 *
 * This service starts listeners for:
 * - BountyReleased events from BountyPool contract
 * - (Future) ProtocolRegistered, ValidationRecorded, etc.
 */
export async function initializeBlockchainEventListeners(): Promise<void> {
  if (!contractAddresses.bountyPool) {
    console.warn('[BlockchainEvents] BOUNTY_POOL_ADDRESS not set - skipping event listeners');
    return;
  }

  console.log('[BlockchainEvents] Initializing event listeners...');

  const eventListener = getEventListenerService();

  try {
    // Start listening for BountyReleased events
    await eventListener.startListening({
      contractAddress: contractAddresses.bountyPool,
      eventName: 'BountyReleased',
      abi: BountyPoolABI.abi,
      handler: handleBountyReleasedEvent,
      fromBlock: Number(process.env.BOUNTY_POOL_DEPLOY_BLOCK || 'latest'),
    });

    console.log('[BlockchainEvents] Event listeners initialized successfully');
  } catch (error) {
    console.error('[BlockchainEvents] Failed to initialize event listeners:', error);
    throw error;
  }
}

/**
 * Shutdown blockchain event listeners
 */
export async function shutdownBlockchainEventListeners(): Promise<void> {
  console.log('[BlockchainEvents] Shutting down event listeners...');

  try {
    const eventListener = getEventListenerService();
    await eventListener.shutdown();
    console.log('[BlockchainEvents] Event listeners shut down successfully');
  } catch (error) {
    console.error('[BlockchainEvents] Failed to shut down event listeners:', error);
  }
}
