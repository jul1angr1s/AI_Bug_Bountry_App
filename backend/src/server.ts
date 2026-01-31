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
import { startValidatorAgent, stopValidatorAgent } from './agents/validator/index.js';

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

server.listen(config.PORT, async () => {
  console.log(`Backend listening on port ${config.PORT} (${config.NODE_ENV})`);

  // Start Validator Agent
  try {
    await startValidatorAgent();
    console.log('Validator Agent started successfully');
  } catch (error) {
    console.error('Failed to start Validator Agent:', error);
  }
});

const prisma = getPrismaClient();

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received, starting graceful shutdown...`);

  const timeout = setTimeout(() => {
    console.error('Shutdown timeout, forcing exit');
    process.exit(1);
  }, 10_000);

  // Stop Validator Agent first
  try {
    await stopValidatorAgent();
    console.log('Validator Agent stopped');
  } catch (error) {
    console.error('Error stopping Validator Agent:', error);
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
