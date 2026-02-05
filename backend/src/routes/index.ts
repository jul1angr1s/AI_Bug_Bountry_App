import { Router } from 'express';
import healthRouter from './health.js';
import dashboardRouter from './dashboard.routes.js';
import protocolRouter from './protocol.routes.js';
import fundingRouter from './funding.routes.js';
import agentRouter from './agent.routes.js';
import agentIdentityRouter from './agent-identity.routes.js';
import scansRouter from './scans.js';
import paymentRouter from './payment.routes.js';
import validationRouter from './validation.routes.js';
import adminRouter from './admin.js';

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
router.use('/protocols', fundingRouter); // Funding gate routes (verify-funding, request-scan)
router.use('/agents', agentRouter);

// ERC-8004 Agent Identity & x.402 Escrow endpoints
router.use('/agent-identities', agentIdentityRouter);

// Researcher Agent - Scan endpoints
router.use('/scans', scansRouter);

// Payment and USDC endpoints
router.use('/payments', paymentRouter);

// Validation endpoints
router.use('/validations', validationRouter);

// Admin endpoints (requires admin authentication)
router.use('/admin', adminRouter);

router.use('/vulnerabilities', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'NotImplemented',
      message: 'Vulnerabilities API not implemented yet',
    },
  });
});

export default router;
