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
import { setupProcessErrorHandlers } from './lib/process-error-handler.js';
import { resolveRuntimeMode, shouldStartApiServer, shouldStartBackgroundWorkers } from './startup/runtime-mode.js';
import { startBackgroundRuntime, stopBackgroundRuntime, type BackgroundRuntime } from './startup/background-runtime.js';

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

const runtimeMode = resolveRuntimeMode();
let backgroundRuntime: BackgroundRuntime | null = null;

async function bootstrapRuntime(): Promise<void> {
  if (shouldStartBackgroundWorkers(runtimeMode)) {
    backgroundRuntime = await startBackgroundRuntime();
  }

  if (shouldStartApiServer(runtimeMode)) {
    server.listen(config.PORT, () => {
      log.info({ port: config.PORT, env: config.NODE_ENV, runtimeMode }, 'Backend listening');
    });
    return;
  }

  log.info({ runtimeMode }, 'API server disabled for this runtime mode');
}

void bootstrapRuntime();

const prisma = getPrismaClient();

async function shutdown(signal: string): Promise<void> {
  log.info({ signal }, 'Graceful shutdown initiated');

  const timeout = setTimeout(() => {
    log.error('Shutdown timeout, forcing exit');
    process.exit(1);
  }, 10_000);

  await stopBackgroundRuntime(backgroundRuntime);

  if (!shouldStartApiServer(runtimeMode)) {
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
    return;
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
