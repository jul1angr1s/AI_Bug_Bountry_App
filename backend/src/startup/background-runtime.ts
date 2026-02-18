import { startValidatorAgentLLM, stopValidatorAgentLLM } from '../agents/validator/index.js';
import { startValidationListener, stopValidationListener } from '../blockchain/listeners/validation-listener.js';
import { startBountyListener, stopBountyListener } from '../blockchain/listeners/bounty-listener.js';
import { getReconciliationService } from '../services/reconciliation.service.js';
import { startPaymentWorker, stopPaymentWorker } from '../workers/payment.worker.js';
import { startProtocolWorker, stopProtocolWorker } from '../queues/protocol.queue.js';
import { startResearcherAgent, stopResearcherAgent } from '../agents/researcher/index.js';
import { bootstrapDefaultAgents } from './agent-bootstrap.js';
import { createLogger } from '../lib/logger.js';
import type { Worker } from 'bullmq';

const log = createLogger('BackgroundRuntime');

export interface BackgroundRuntime {
  paymentWorker: Worker | null;
  started: boolean;
}

export async function startBackgroundRuntime(): Promise<BackgroundRuntime> {
  let paymentWorker: Worker | null = null;

  try {
    await bootstrapDefaultAgents();
  } catch (error) {
    log.error({ err: error }, 'Failed to bootstrap default agents');
  }

  try {
    await startResearcherAgent();
    log.info({ queue: 'scan-jobs', concurrency: 2 }, 'Researcher agent worker started successfully');
  } catch (error) {
    log.error({ err: error }, 'Failed to start researcher agent worker');
  }

  try {
    await startValidatorAgentLLM();
    log.info('Validator Agent (LLM) started successfully');
  } catch (error) {
    log.error({ err: error }, 'Failed to start Validator Agent (LLM)');
  }

  try {
    await startValidationListener();
    log.info('ValidationRecorded event listener started successfully');
  } catch (error) {
    log.error({ err: error }, 'Failed to start ValidationRecorded listener');
  }

  try {
    await startBountyListener();
    log.info('BountyReleased event listener started successfully');
  } catch (error) {
    log.error({ err: error }, 'Failed to start BountyReleased listener');
  }

  try {
    startProtocolWorker();
    log.info({ queue: 'protocol-registration', concurrency: 2 }, 'Protocol registration worker started successfully');
  } catch (error) {
    log.error({ err: error }, 'Failed to start protocol worker');
  }

  try {
    paymentWorker = startPaymentWorker();
    log.info('Payment processing worker started successfully');
  } catch (error) {
    log.error({ err: error }, 'Failed to start payment worker');
  }

  try {
    const reconciliationService = getReconciliationService();
    await reconciliationService.initializePeriodicReconciliation();
    log.info({ intervalMin: 10 }, 'Reconciliation service started successfully');
  } catch (error) {
    log.error({ err: error }, 'Failed to start reconciliation service');
  }

  return { paymentWorker, started: true };
}

export async function stopBackgroundRuntime(runtime: BackgroundRuntime | null): Promise<void> {
  if (!runtime?.started) {
    return;
  }

  try {
    await stopValidatorAgentLLM();
    log.info('Validator Agent (LLM) stopped');
  } catch (error) {
    log.error({ err: error }, 'Error stopping Validator Agent (LLM)');
  }

  try {
    await stopValidationListener();
    log.info('ValidationRecorded event listener stopped');
  } catch (error) {
    log.error({ err: error }, 'Error stopping ValidationRecorded listener');
  }

  try {
    await stopBountyListener();
    log.info('BountyReleased event listener stopped');
  } catch (error) {
    log.error({ err: error }, 'Error stopping BountyReleased listener');
  }

  try {
    await stopProtocolWorker();
    log.info('Protocol registration worker stopped');
  } catch (error) {
    log.error({ err: error }, 'Error stopping protocol worker');
  }

  try {
    await stopResearcherAgent();
    log.info('Researcher agent worker stopped');
  } catch (error) {
    log.error({ err: error }, 'Error stopping researcher agent worker');
  }

  try {
    if (runtime.paymentWorker) {
      await stopPaymentWorker(runtime.paymentWorker);
      log.info('Payment processing worker stopped');
    }
  } catch (error) {
    log.error({ err: error }, 'Error stopping payment worker');
  }

  try {
    const reconciliationService = getReconciliationService();
    await reconciliationService.close();
    log.info('Reconciliation service stopped');
  } catch (error) {
    log.error({ err: error }, 'Error stopping reconciliation service');
  }
}
