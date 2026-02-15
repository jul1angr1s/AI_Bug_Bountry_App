import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import http from 'http';
import './config/security.js'; // Security startup guards - must be first
import { initializeContainer } from './di/container.js';
import apiRouter from './routes/index.js';
import authRoutes from './routes/auth.routes.js';
import { config } from './config/env.js';
import { requestId } from './middleware/requestId.js';
import { authenticate } from './middleware/auth.js';
import { setCsrfCookie, verifyCsrfToken, getCsrfTokenEndpoint } from './middleware/csrf.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { correlationStorage, createLogger } from './lib/logger.js';
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
import { bootstrapDefaultAgents } from './startup/agent-bootstrap.js';
import type { Worker } from 'bullmq';

const log = createLogger('Server');

// Setup process-level error handlers
setupProcessErrorHandlers();

// Initialize dependency injection container
initializeContainer();

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: [
        "'self'",
        'https://base-sepolia.g.alchemy.com',
        'https://*.supabase.co',
        config.FRONTEND_URL,
      ].filter(Boolean),
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
    exposedHeaders: ['Set-Cookie', 'PAYMENT-REQUIRED'],
  })
);
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(requestId);
// Bind correlation ID to async context for structured logging
app.use((req, _res, next) => {
  correlationStorage.run(req.id || 'unknown', next);
});
app.use(setCsrfCookie);

// Register auth routes BEFORE global authentication middleware
// This allows public endpoints like /auth/siwe to work without authentication
app.use('/api/v1/auth', authRoutes);

app.use(authenticate);

// CSRF token endpoint (before CSRF verification)
app.get('/api/v1/csrf-token', getCsrfTokenEndpoint);

// Apply CSRF verification to state-changing routes
app.use('/api/v1/protocols', verifyCsrfToken);
app.use('/api/v1/payments', verifyCsrfToken);
app.use('/api/v1/funding', verifyCsrfToken);
app.use('/api/v1/agent-identities', verifyCsrfToken);
app.use('/api/v1/scans', verifyCsrfToken);

app.use('/api/v1', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const server = http.createServer(app);
const io = createSocketServer(server);
registerSocketHandlers(io);

// Store worker instance for graceful shutdown
let paymentWorkerInstance: Worker | null = null;

server.listen(config.PORT, async () => {
  log.info({ port: config.PORT, env: config.NODE_ENV }, 'Backend listening');

  // Ensure baseline agent records exist before workers begin consuming queue jobs
  try {
    await bootstrapDefaultAgents();
  } catch (error) {
    log.error({ err: error }, 'Failed to bootstrap default agents');
  }

  // Start Validator Agent (LLM-based for Phase 2)
  try {
    await startValidatorAgentLLM();
    log.info('Validator Agent (LLM) started successfully');
  } catch (error) {
    log.error({ err: error }, 'Failed to start Validator Agent (LLM)');
  }

  // Start researcher agent worker before other long-startup listeners
  try {
    await startResearcherAgent();
    log.info({ queue: 'scan-jobs', concurrency: 2 }, 'Researcher agent worker started successfully');
  } catch (error) {
    log.error({ err: error }, 'Failed to start researcher agent worker');
  }

  // Start ValidationRecorded event listener
  try {
    await startValidationListener();
    log.info('ValidationRecorded event listener started successfully');
  } catch (error) {
    log.error({ err: error }, 'Failed to start ValidationRecorded listener');
  }

  // Start BountyReleased event listener
  try {
    await startBountyListener();
    log.info('BountyReleased event listener started successfully');
  } catch (error) {
    log.error({ err: error }, 'Failed to start BountyReleased listener');
  }

  // Start protocol registration worker
  try {
    startProtocolWorker();
    log.info({ queue: 'protocol-registration', concurrency: 2 }, 'Protocol registration worker started successfully');
  } catch (error) {
    log.error({ err: error }, 'Failed to start protocol worker');
  }

  // Start payment processing worker
  try {
    paymentWorkerInstance = startPaymentWorker();
    log.info('Payment processing worker started successfully');
  } catch (error) {
    log.error({ err: error }, 'Failed to start payment worker');
  }

  // Start reconciliation service
  try {
    const reconciliationService = getReconciliationService();
    await reconciliationService.initializePeriodicReconciliation();
    log.info({ intervalMin: 10 }, 'Reconciliation service started successfully');
  } catch (error) {
    log.error({ err: error }, 'Failed to start reconciliation service');
  }
});

const prisma = getPrismaClient();

async function shutdown(signal: string): Promise<void> {
  log.info({ signal }, 'Graceful shutdown initiated');

  const timeout = setTimeout(() => {
    log.error('Shutdown timeout, forcing exit');
    process.exit(1);
  }, 10_000);

  // Stop services in order
  try {
    await stopValidatorAgentLLM();
    log.info('Validator Agent (LLM) stopped');
  } catch (error) {
    log.error({ err: error }, 'Error stopping Validator Agent (LLM)');
  }

  try {
    // Stop ValidationRecorded event listener
    await stopValidationListener();
    log.info('ValidationRecorded event listener stopped');
  } catch (error) {
    log.error({ err: error }, 'Error stopping ValidationRecorded listener');
  }

  try {
    // Stop BountyReleased event listener
    await stopBountyListener();
    log.info('BountyReleased event listener stopped');
  } catch (error) {
    log.error({ err: error }, 'Error stopping BountyReleased listener');
  }

  try {
    // Stop protocol worker
    await stopProtocolWorker();
    log.info('Protocol registration worker stopped');
  } catch (error) {
    log.error({ err: error }, 'Error stopping protocol worker');
  }

  try {
    // Stop researcher agent worker
    await stopResearcherAgent();
    log.info('Researcher agent worker stopped');
  } catch (error) {
    log.error({ err: error }, 'Error stopping researcher agent worker');
  }

  try {
    // Stop payment worker
    if (paymentWorkerInstance) {
      await stopPaymentWorker(paymentWorkerInstance);
      log.info('Payment processing worker stopped');
    }
  } catch (error) {
    log.error({ err: error }, 'Error stopping payment worker');
  }

  try {
    // Stop reconciliation service
    const reconciliationService = getReconciliationService();
    await reconciliationService.close();
    log.info('Reconciliation service stopped');
  } catch (error) {
    log.error({ err: error }, 'Error stopping reconciliation service');
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
  log.error({ err: error }, 'Server error');
  process.exit(1);
});
