import { Request, Response, NextFunction } from 'express';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { HTTPFacilitatorClient } from '@x402/core/server';
import type { Network } from '@x402/core/types';
import { PrismaClient } from '@prisma/client';
import { escrowService } from '../services/escrow.service.js';

const prisma = new PrismaClient();

// ============================================================
// x.402 Configuration — Coinbase facilitator
// ============================================================

const PLATFORM_WALLET = process.env.PLATFORM_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';
const SUBMISSION_FEE = '500000'; // 0.5 USDC in base units

// Facilitator URL: testnet for Base Sepolia, CDP API for mainnet
const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://www.x402.org/facilitator';

// Network CAIP-2 identifier: Base Sepolia = eip155:84532, Base Mainnet = eip155:8453
const NETWORK = (process.env.X402_NETWORK || 'eip155:84532') as Network;

// Protocol registration fee: 1 USDC
const PROTOCOL_REGISTRATION_FEE_USD = '$1.00';

// Initialize x402 facilitator client and resource server
const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(NETWORK, new ExactEvmScheme());

// ============================================================
// Protocol Registration Gate — x.402 via Coinbase facilitator
// ============================================================

/**
 * x.402 payment gate for protocol registration.
 *
 * Uses Coinbase's x402 facilitator for cryptographic payment verification
 * and on-chain settlement. Returns standard HTTP 402 with PAYMENT-REQUIRED
 * header. Clients must include PAYMENT-SIGNATURE header on retry.
 */
export function x402ProtocolRegistrationGate() {
  const skipPaymentGate = process.env.SKIP_X402_PAYMENT_GATE === 'true';

  if (skipPaymentGate) {
    return (_req: Request, _res: Response, next: NextFunction) => {
      console.log('[x402] Payment gate skipped (SKIP_X402_PAYMENT_GATE=true)');
      next();
    };
  }

  // Use x402-express paymentMiddleware with Coinbase facilitator
  // This handles: 402 response, PAYMENT-REQUIRED header, PAYMENT-SIGNATURE verification,
  // replay prevention, payer identity verification, and on-chain settlement
  const routes = {
    accepts: {
      scheme: 'exact',
      price: PROTOCOL_REGISTRATION_FEE_USD,
      network: NETWORK,
      payTo: PLATFORM_WALLET,
    },
    description: 'Protocol registration fee for AI Bug Bounty Platform',
  };

  const middleware = paymentMiddleware(routes, resourceServer);

  // Wrap to also record payment in our database
  return async (req: Request, res: Response, next: NextFunction) => {
    // Intercept the response to capture payment details
    const originalNext = next;
    const wrappedNext = async () => {
      // If we get here, payment was verified by the facilitator
      try {
        const paymentSignature = req.headers['payment-signature'] as string;
        const requester = req.body?.ownerAddress || 'unknown';

        await prisma.x402PaymentRequest.create({
          data: {
            requestType: 'PROTOCOL_REGISTRATION',
            requesterAddress: requester.toLowerCase(),
            amount: BigInt(1000000), // 1 USDC
            status: 'COMPLETED',
            txHash: paymentSignature?.slice(0, 66) || undefined,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            completedAt: new Date(),
          },
        }).catch(err => console.error('[x402] Failed to record payment:', err));

        console.log(`[x402] Protocol registration payment verified via facilitator`);
      } catch (err) {
        console.error('[x402] Error recording payment:', err);
      }

      originalNext();
    };

    middleware(req, res, wrappedNext);
  };
}

// ============================================================
// Finding Submission Gate — Escrow balance check (not x.402)
// ============================================================

/**
 * Finding submission gate based on escrow balance.
 *
 * This is NOT an x.402 flow — it's a prepaid escrow balance check.
 * Researchers must have sufficient USDC deposited in their escrow
 * to cover the submission fee.
 */
export function x402FindingSubmissionGate() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const skipPaymentGate = process.env.SKIP_X402_PAYMENT_GATE === 'true';
    if (skipPaymentGate) {
      console.log('[x402] Payment gate skipped (SKIP_X402_PAYMENT_GATE=true)');
      return next();
    }

    const researcherWallet = req.body.researcherAddress || req.headers['x-researcher-wallet'];

    if (!researcherWallet) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Researcher wallet address is required',
      });
    }

    try {
      const canSubmit = await escrowService.canSubmitFinding(researcherWallet as string);

      if (!canSubmit) {
        const balance = await escrowService.getEscrowBalance(researcherWallet as string);

        return res.status(402).json({
          error: 'Insufficient Escrow Balance',
          message: 'Finding submission requires 0.5 USDC in escrow',
          currentBalance: balance.balance.toString(),
          requiredAmount: SUBMISSION_FEE,
          instructions: {
            step1: 'Deposit USDC to your escrow balance',
            step2: 'Call POST /api/v1/agents/:id/escrow/deposit',
            step3: 'Retry the finding submission',
          },
          escrowContract: process.env.PLATFORM_ESCROW_ADDRESS,
        });
      }

      (req as any).researcherWallet = researcherWallet;
      console.log(`[x402] Escrow balance verified for researcher: ${researcherWallet}`);
      next();
    } catch (error) {
      console.error('[x402] Escrow check error:', error);
      return res.status(500).json({
        error: 'Escrow Check Failed',
        message: 'Could not verify escrow balance',
      });
    }
  };
}
