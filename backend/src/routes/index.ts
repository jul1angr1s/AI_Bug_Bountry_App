import { Router } from 'express';
import healthRouter from './health.js';
import dashboardRouter from './dashboard.routes.js';
import protocolRouter from './protocol.routes.js';
import agentRouter from './agent.routes.js';
import scansRouter from './scans.js';
import paymentRouter from './payment.routes.js';
import validationRouter from './validation.routes.js';

const router = Router();

router.use((req, res, next) => {
  res.setHeader('X-API-Version', '1.0');
  next();
});

router.use(healthRouter);

// Dashboard API endpoints
router.use(dashboardRouter);

// Protocol Agent endpoints
router.use('/protocols', protocolRouter);
router.use('/agents', agentRouter);

// Researcher Agent - Scan endpoints
router.use('/scans', scansRouter);

// Payment endpoints
router.use('/payments', paymentRouter);

// Validation endpoints
router.use('/validations', validationRouter);

router.use('/vulnerabilities', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'NotImplemented',
      message: 'Vulnerabilities API not implemented yet',
    },
  });
});

export default router;
