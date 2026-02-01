import { Router } from 'express';
import {
  listPayments,
  getPayment,
  getResearcherPayments,
  retryPayment,
  getPaymentStats,
} from '../controllers/payment.controller.js';

const router = Router();

/**
 * Payment Routes
 *
 * GET    /api/v1/payments              - List all payments (with filters)
 * GET    /api/v1/payments/stats        - Payment statistics
 * GET    /api/v1/payments/:id          - Payment details
 * GET    /api/v1/payments/researcher/:address - Payments by researcher
 * POST   /api/v1/payments/:id/retry    - Manual retry failed payment (admin)
 */

// Stats endpoint (before :id to avoid route conflict)
router.get('/stats', getPaymentStats);

// Researcher payments
router.get('/researcher/:address', getResearcherPayments);

// List and detail
router.get('/', listPayments);
router.get('/:id', getPayment);

// Admin actions
router.post('/:id/retry', retryPayment); // TODO: Add admin middleware

export default router;
