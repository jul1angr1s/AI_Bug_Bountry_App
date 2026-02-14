import {
  getEventListenerService,
  handleBountyReleasedEvent,
} from './event-listener.service.js';
import { contractAddresses } from '../blockchain/config.js';
import BountyPoolABI from '../blockchain/abis/BountyPool.json' with { type: 'json' };
import { createLogger } from '../lib/logger.js';

const log = createLogger('BlockchainEvents');

/**
 * Initialize blockchain event listeners
 *
 * This service starts listeners for:
 * - BountyReleased events from BountyPool contract
 * - (Future) ProtocolRegistered, ValidationRecorded, etc.
 */
export async function initializeBlockchainEventListeners(): Promise<void> {
  if (!contractAddresses.bountyPool) {
    log.warn('BOUNTY_POOL_ADDRESS not set - skipping event listeners');
    return;
  }

  log.info('Initializing event listeners...');

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

    log.info('Event listeners initialized successfully');
  } catch (error) {
    log.error({ err: error }, 'Failed to initialize event listeners');
    throw error;
  }
}

/**
 * Shutdown blockchain event listeners
 */
export async function shutdownBlockchainEventListeners(): Promise<void> {
  log.info('Shutting down event listeners...');

  try {
    const eventListener = getEventListenerService();
    await eventListener.shutdown();
    log.info('Event listeners shut down successfully');
  } catch (error) {
    log.error({ err: error }, 'Failed to shut down event listeners');
  }
}
