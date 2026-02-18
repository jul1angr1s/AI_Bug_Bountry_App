import { Router } from 'express';
import usdcRoutes from './usdc.routes.js';
import paymentQueryRoutes from './payment-query.routes.js';
import analyticsRoutes from './analytics.routes.js';
import proposalRoutes from './proposal.routes.js';
import paymentDetailsRoutes from './payment-details.routes.js';

const router = Router();

router.use(usdcRoutes);
router.use(paymentQueryRoutes);
router.use(analyticsRoutes);
router.use(proposalRoutes);
router.use(paymentDetailsRoutes);

export default router;
