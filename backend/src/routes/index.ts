import { Router } from 'express';
import healthRouter from './health.js';

const router = Router();

router.use((req, res, next) => {
  res.setHeader('X-API-Version', '1.0');
  next();
});

router.use(healthRouter);

router.use('/protocols', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'NotImplemented',
      message: 'Protocols API not implemented yet',
    },
  });
});

router.use('/scans', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'NotImplemented',
      message: 'Scans API not implemented yet',
    },
  });
});

router.use('/vulnerabilities', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'NotImplemented',
      message: 'Vulnerabilities API not implemented yet',
    },
  });
});

export default router;
