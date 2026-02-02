import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import apiRouter from './routes/index.js';
import { config } from './config/env.js';
import { requestId } from './middleware/requestId.js';
import { authenticate } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createSocketServer } from './websocket/server.js';
import { registerSocketHandlers } from './websocket/handlers.js';
import { getPrismaClient } from './lib/prisma.js';
import { startValidatorAgentLLM, stopValidatorAgentLLM } from './agents/validator/index.js';
import { startValidationListener, stopValidationListener } from './blockchain/listeners/validation-listener.js';
import { startBountyListener, stopBountyListener } from './blockchain/listeners/bounty-listener.js';
import { getReconciliationService } from './services/reconciliation.service.js';
import { startPaymentWorker, stopPaymentWorker } from './workers/payment.worker.js';
import { startProtocolWorker, stopProtocolWorker } from './queues/protocol.queue.js';
import { startResearcherAgent, stopResearcherAgent } from './agents/researcher/index.js';
import { setupProcessErrorHandlers } from './lib/process-error-handler.js';
import type { Worker } from 'bullmq';

// Setup process-level error handlers
setupProcessErrorHandlers();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
  })
);
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(requestId);
app.use(authenticate);

app.use('/api/v1', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const server = http.createServer(app);
const io = createSocketServer(server);
registerSocketHandlers(io);

// Store worker instance for graceful shutdown
let paymentWorkerInstance: Worker | null = null;

server.listen(config.PORT, async () => {
  console.log(`Backend listening on port ${config.PORT} (${config.NODE_ENV})`);

  // Start Validator Agent (LLM-based for Phase 2)
  try {
    await startValidatorAgentLLM();
    console.log('Validator Agent (LLM) started successfully');
  } catch (error) {
    console.error('Failed to start Validator Agent (LLM):', error);
  }

  // Start ValidationRecorded event listener
  try {
    await startValidationListener();
    console.log('ValidationRecorded event listener started successfully');
  } catch (error) {
    console.error('Failed to start ValidationRecorded listener:', error);
  }

  // Start BountyReleased event listener
  try {
    await startBountyListener();
    console.log('BountyReleased event listener started successfully');
  } catch (error) {
    console.error('Failed to start BountyReleased listener:', error);
  }

  // Start protocol registration worker
  try {
    startProtocolWorker();
    console.log('[ProtocolWorker] Protocol registration worker started successfully');
    console.log('  Queue: protocol-registration');
    console.log('  Concurrency: 2');
  } catch (error) {
    console.error('Failed to start protocol worker:', error);
  }

  // Start researcher agent worker
  try {
    await startResearcherAgent();
    console.log('[ResearcherAgent] Researcher agent worker started successfully');
    console.log('  Queue: scan-jobs');
    console.log('  Concurrency: 2');
  } catch (error) {
    console.error('Failed to start researcher agent worker:', error);
  }

  // Start payment processing worker
  try {
    paymentWorkerInstance = startPaymentWorker();
    console.log('Payment processing worker started successfully');
  } catch (error) {
    console.error('Failed to start payment worker:', error);
  }

  // Start reconciliation service
  try {
    const reconciliationService = getReconciliationService();
    await reconciliationService.initializePeriodicReconciliation();
    console.log('Reconciliation service started successfully (10-minute interval)');
  } catch (error) {
    console.error('Failed to start reconciliation service:', error);
  }
});

const prisma = getPrismaClient();

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received, starting graceful shutdown...`);

  const timeout = setTimeout(() => {
    console.error('Shutdown timeout, forcing exit');
    process.exit(1);
  }, 10_000);

  // Stop services in order
  try {
    await stopValidatorAgentLLM();
    console.log('Validator Agent (LLM) stopped');
  } catch (error) {
    console.error('Error stopping Validator Agent (LLM):', error);
  }

  try {
    // Stop ValidationRecorded event listener
    await stopValidationListener();
    console.log('ValidationRecorded event listener stopped');
  } catch (error) {
    console.error('Error stopping ValidationRecorded listener:', error);
  }

  try {
    // Stop BountyReleased event listener
    await stopBountyListener();
    console.log('BountyReleased event listener stopped');
  } catch (error) {
    console.error('Error stopping BountyReleased listener:', error);
  }

  try {
    // Stop protocol worker
    await stopProtocolWorker();
    console.log('[ProtocolWorker] Protocol registration worker stopped');
  } catch (error) {
    console.error('Error stopping protocol worker:', error);
  }

  try {
    // Stop researcher agent worker
    await stopResearcherAgent();
    console.log('[ResearcherAgent] Researcher agent worker stopped');
  } catch (error) {
    console.error('Error stopping researcher agent worker:', error);
  }

  try {
    // Stop payment worker
    if (paymentWorkerInstance) {
      await stopPaymentWorker(paymentWorkerInstance);
      console.log('Payment processing worker stopped');
    }
  } catch (error) {
    console.error('Error stopping payment worker:', error);
  }

  try {
    // Stop reconciliation service
    const reconciliationService = getReconciliationService();
    await reconciliationService.close();
    console.log('Reconciliation service stopped');
  } catch (error) {
    console.error('Error stopping reconciliation service:', error);
  }

  server.close(() => {
    io.close(() => {
      prisma
        .$disconnect()
        .then(() => {
          clearTimeout(timeout);
          process.exit(0);
        })
        .catch(() => {
          clearTimeout(timeout);
          process.exit(1);
        });
    });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.on('error', (error) => {
  console.error('Server error', error);
  process.exit(1);
});
