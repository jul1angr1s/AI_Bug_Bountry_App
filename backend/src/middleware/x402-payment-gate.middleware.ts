import { Request, Response, NextFunction } from 'express';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { HTTPFacilitatorClient } from '@x402/core/server';
import type { Network } from '@x402/core/types';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { escrowService } from '../services/escrow.service.js';
import { createLogger } from '../lib/logger.js';
import { buildProtocolRegistrationFingerprint } from '../lib/protocol-payment-fingerprint.js';

const log = createLogger('X402PaymentGate');

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
const PROTOCOL_PAYMENT_RETRY_WINDOW_MS = 30 * 60 * 1000;

// Protocol registration fee: 1 USDC
const PROTOCOL_REGISTRATION_FEE_USD = '$1.00';

// Initialize x402 facilitator client and resource server
const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(NETWORK, new ExactEvmScheme())
  .onAfterSettle(async (context) => {
    const { result } = context;
    if (result.success && result.transaction && result.payer) {
      try {
        // Update the most recent COMPLETED record with null txHash for this payer
        const updated = await prisma.x402PaymentRequest.updateMany({
          where: {
            requesterAddress: result.payer.toLowerCase(),
            txHash: null,
            status: 'COMPLETED',
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
          data: { txHash: result.transaction },
        });
        if (updated.count > 0) {
          log.info({ txHash: result.transaction }, 'Settlement tx captured');
        }
      } catch (err) {
        log.error({ err }, 'Failed to update payment with settlement tx');
      }
    }
  });

// Base Sepolia USDC contract address
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// ERC-20 Transfer event signature: Transfer(address,address,uint256)
const TRANSFER_EVENT_TOPIC = ethers.id('Transfer(address,address,uint256)');

// Lazy-initialized provider (avoids importing blockchain/config which eagerly creates wallets)
let _provider: ethers.JsonRpcProvider | null = null;
function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(
      process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
    );
  }
  return _provider;
}

/**
 * Verify an on-chain USDC transfer by checking the transaction receipt.
 * Returns true if the tx is confirmed, transfers USDC to the expected recipient
 * for at least the expected amount.
 */
async function verifyOnChainPayment(
  txHash: string,
  expectedRecipient: string,
  expectedAmount: bigint,
): Promise<boolean> {
  const provider = getProvider();
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) return false;

  const usdcAddress = USDC_ADDRESS.toLowerCase();
  const recipientPadded = ethers.zeroPadValue(expectedRecipient.toLowerCase(), 32);

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== usdcAddress) continue;
    if (log.topics[0] !== TRANSFER_EVENT_TOPIC) continue;
    // topics[2] is the `to` address
    if (log.topics[2]?.toLowerCase() !== recipientPadded) continue;

    const transferAmount = BigInt(log.data);
    if (transferAmount >= expectedAmount) return true;
  }

  return false;
}

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
      log.debug('Payment gate skipped (SKIP_X402_PAYMENT_GATE=true)');
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
    const originalNext = next;
    const ownerAddress = (req.body?.ownerAddress || '').toLowerCase();
    const registrationFingerprint = buildProtocolRegistrationFingerprint(req.body || {});

    // If a recent successful payment exists for this exact registration payload and
    // it has not been consumed by a created protocol yet, bypass 402 to avoid double charge.
    if (ownerAddress && registrationFingerprint) {
      const existingCompletedPayment = await prisma.x402PaymentRequest.findFirst({
        where: {
          requestType: 'PROTOCOL_REGISTRATION',
          requesterAddress: ownerAddress,
          status: 'COMPLETED',
          protocolId: null,
          paymentReceipt: registrationFingerprint,
          completedAt: {
            gte: new Date(Date.now() - PROTOCOL_PAYMENT_RETRY_WINDOW_MS),
          },
        },
        orderBy: { completedAt: 'desc' },
      });

      if (existingCompletedPayment) {
        log.info(
          {
            requesterAddress: ownerAddress,
            paymentId: existingCompletedPayment.id,
            fingerprint: registrationFingerprint.slice(0, 12),
          },
          'Bypassing protocol registration 402 due to recent completed payment'
        );
        return originalNext();
      }
    }

    // Check if payment-signature looks like a raw tx hash (direct USDC transfer)
    // If so, verify the transfer on-chain before falling through to the facilitator
    const paymentSig = req.headers['payment-signature'] as string | undefined;
    if (paymentSig && paymentSig.startsWith('0x') && paymentSig.length === 66) {
      try {
        const verified = await verifyOnChainPayment(
          paymentSig,
          PLATFORM_WALLET,
          BigInt(1000000), // 1 USDC in base units
        );
        if (verified) {
          const requester = req.body?.ownerAddress || 'unknown';
          await prisma.x402PaymentRequest.create({
            data: {
              requestType: 'PROTOCOL_REGISTRATION',
              requesterAddress: requester.toLowerCase(),
              amount: BigInt(1000000),
              status: 'COMPLETED',
              paymentReceipt: registrationFingerprint,
              txHash: paymentSig,
              expiresAt: new Date(Date.now() + 30 * 60 * 1000),
              completedAt: new Date(),
            },
          }).catch(err => log.error({ err }, 'Failed to record payment'));

          log.info({ txHash: paymentSig }, 'Protocol registration payment verified on-chain');
          return originalNext();
        }
        log.debug({ txHash: paymentSig }, 'On-chain verification failed, falling through to facilitator');
      } catch (err) {
        log.error({ err }, 'On-chain verification error');
        // Fall through to facilitator
      }
    }

    // Standard x402 facilitator path
    const wrappedNext = async () => {
      // If we get here, payment was verified by the facilitator
      try {
        const requester = req.body?.ownerAddress || 'unknown';

        await prisma.x402PaymentRequest.create({
          data: {
            requestType: 'PROTOCOL_REGISTRATION',
            requesterAddress: requester.toLowerCase(),
            amount: BigInt(1000000), // 1 USDC
            status: 'COMPLETED',
            paymentReceipt: registrationFingerprint,
            txHash: null, // Updated by onAfterSettle hook with real settlement tx
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            completedAt: new Date(),
          },
        }).catch(err => log.error({ err }, 'Failed to record payment'));

        log.info('Protocol registration payment verified via facilitator');
      } catch (err) {
        log.error({ err }, 'Error recording payment');
      }

      originalNext();
    };

    middleware(req, res, wrappedNext);
  };
}

// ============================================================
// Scan Request Fee Gate — x.402 $10 fee to fee wallet
// ============================================================

const SCAN_REQUEST_FEE_USD = '$10.00';
const SCAN_FEE_WALLET = process.env.SCAN_FEE_WALLET_ADDRESS || '';

if (!SCAN_FEE_WALLET && process.env.SKIP_X402_PAYMENT_GATE !== 'true') {
  log.warn('SCAN_FEE_WALLET_ADDRESS not configured — scan fee gate will reject requests');
}

/**
 * x.402 payment gate for scan requests.
 *
 * Charges $10 USDC to the fee wallet for each scan request.
 * Uses the same Coinbase x402 facilitator as protocol registration.
 */
export function x402ScanRequestFeeGate() {
  const skipPaymentGate = process.env.SKIP_X402_PAYMENT_GATE === 'true';

  if (skipPaymentGate) {
    return (_req: Request, _res: Response, next: NextFunction) => {
      log.debug('Scan request fee gate skipped (SKIP_X402_PAYMENT_GATE=true)');
      next();
    };
  }

  const routes = {
    accepts: {
      scheme: 'exact',
      price: SCAN_REQUEST_FEE_USD,
      network: NETWORK,
      payTo: SCAN_FEE_WALLET,
    },
    description: 'Scan request fee for AI Bug Bounty Platform',
  };

  const middleware = paymentMiddleware(routes, resourceServer);

  return async (req: Request, res: Response, next: NextFunction) => {
    const originalNext = next;

    // Check if payment-signature looks like a raw tx hash (direct USDC transfer)
    const paymentSig = req.headers['payment-signature'] as string | undefined;
    if (paymentSig && paymentSig.startsWith('0x') && paymentSig.length === 66) {
      try {
        const verified = await verifyOnChainPayment(
          paymentSig,
          SCAN_FEE_WALLET,
          BigInt(10000000), // 10 USDC in base units
        );
        if (verified) {
          const requester = req.body?.researcherAddress || req.headers['x-researcher-wallet'] || 'unknown';
          await prisma.x402PaymentRequest.create({
            data: {
              requestType: 'SCAN_REQUEST_FEE',
              requesterAddress: String(requester).toLowerCase(),
              amount: BigInt(10000000),
              status: 'COMPLETED',
              txHash: paymentSig,
              recipientAddress: SCAN_FEE_WALLET.toLowerCase(),
              protocolId: req.body?.protocolId || null,
              expiresAt: new Date(Date.now() + 30 * 60 * 1000),
              completedAt: new Date(),
            },
          }).catch(err => log.error({ err }, 'Failed to record scan fee payment'));

          log.info({ txHash: paymentSig }, 'Scan request fee payment verified on-chain');
          return originalNext();
        }
      } catch (err) {
        log.error({ err }, 'On-chain verification error for scan fee');
      }
    }

    // Standard x402 facilitator path
    const wrappedNext = async () => {
      try {
        const requester = req.body?.researcherAddress || req.headers['x-researcher-wallet'] || 'unknown';

        await prisma.x402PaymentRequest.create({
          data: {
            requestType: 'SCAN_REQUEST_FEE',
            requesterAddress: String(requester).toLowerCase(),
            amount: BigInt(10000000),
            status: 'COMPLETED',
            txHash: null, // Updated by onAfterSettle hook with real settlement tx
            recipientAddress: SCAN_FEE_WALLET.toLowerCase(),
            protocolId: req.body?.protocolId || null,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            completedAt: new Date(),
          },
        }).catch(err => log.error({ err }, 'Failed to record scan fee payment'));

        log.info('Scan request fee payment verified via facilitator');
      } catch (err) {
        log.error({ err }, 'Error recording scan fee payment');
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
      log.debug('Payment gate skipped (SKIP_X402_PAYMENT_GATE=true)');
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
      log.info({ researcherWallet }, 'Escrow balance verified for researcher');
      next();
    } catch (error) {
      log.error({ err: error }, 'Escrow check error');
      return res.status(500).json({
        error: 'Escrow Check Failed',
        message: 'Could not verify escrow balance',
      });
    }
  };
}
