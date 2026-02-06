import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { escrowService } from '../services/escrow.service.js';

const prisma = new PrismaClient();

interface X402PaymentTerms {
  version: string;
  amount: string;
  asset: string;
  chain: string;
  recipient: string;
  memo?: string;
  expiresAt: string;
}

interface X402Receipt {
  txHash: string;
  amount: string;
  payer: string;
  timestamp: string;
  signature?: string;
}

const PLATFORM_WALLET = process.env.PLATFORM_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';
const USDC_ADDRESS = process.env.USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const PROTOCOL_REGISTRATION_FEE = '1000000';
const SUBMISSION_FEE = '500000';

// ERC-20 Transfer event signature
const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');

const provider = new ethers.JsonRpcProvider(
  process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
);

export function createX402PaymentResponse(
  amount: string,
  memo: string
): X402PaymentTerms {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  return {
    version: '1.0',
    amount,
    asset: USDC_ADDRESS,
    chain: 'base-sepolia',
    recipient: PLATFORM_WALLET,
    memo,
    expiresAt,
  };
}

export async function verifyX402Receipt(
  receipt: X402Receipt,
  expectedAmount: string
): Promise<{ valid: boolean; reason?: string }> {
  if (!receipt.txHash || !receipt.amount || !receipt.payer) {
    return { valid: false, reason: 'Missing required receipt fields' };
  }

  const isValidFormat = /^0x[a-fA-F0-9]{64}$/.test(receipt.txHash);
  if (!isValidFormat) {
    return { valid: false, reason: 'Invalid transaction hash format' };
  }

  // Check for replay: has this tx hash already been used?
  const existingPayment = await prisma.x402PaymentRequest.findFirst({
    where: { txHash: receipt.txHash, status: 'COMPLETED' },
  });

  if (existingPayment) {
    return { valid: false, reason: 'Transaction hash already used (replay detected)' };
  }

  // Verify on-chain transaction
  try {
    const txReceipt = await provider.getTransactionReceipt(receipt.txHash);

    if (!txReceipt) {
      return { valid: false, reason: 'Transaction not found on-chain' };
    }

    if (txReceipt.status !== 1) {
      return { valid: false, reason: 'Transaction failed on-chain' };
    }

    // Parse USDC Transfer events from the receipt
    const usdcAddress = USDC_ADDRESS.toLowerCase();
    const platformWallet = PLATFORM_WALLET.toLowerCase();
    const requiredAmount = BigInt(expectedAmount);

    let transferFound = false;

    for (const log of txReceipt.logs) {
      if (log.address.toLowerCase() !== usdcAddress) continue;
      if (log.topics[0] !== TRANSFER_TOPIC) continue;

      // Decode Transfer(address from, address to, uint256 value)
      const to = ethers.getAddress('0x' + log.topics[2].slice(26)).toLowerCase();
      const value = BigInt(log.data);

      if (to === platformWallet && value >= requiredAmount) {
        transferFound = true;
        break;
      }
    }

    if (!transferFound) {
      return { valid: false, reason: 'No USDC transfer to platform wallet found in transaction' };
    }

    return { valid: true };
  } catch (error) {
    // If RPC call fails, fall back to format-only validation in dev
    if (process.env.NODE_ENV === 'development') {
      console.warn('[x402] On-chain verification failed, accepting format-valid receipt in dev mode:', error);
      return { valid: true };
    }
    return { valid: false, reason: 'On-chain verification failed' };
  }
}

async function createPaymentRequest(
  requestType: 'PROTOCOL_REGISTRATION' | 'FINDING_SUBMISSION',
  requesterAddress: string,
  amount: string,
  status: 'PENDING' | 'COMPLETED',
  txHash?: string,
  protocolId?: string
) {
  return prisma.x402PaymentRequest.create({
    data: {
      requestType,
      requesterAddress: requesterAddress.toLowerCase(),
      amount: BigInt(amount),
      status,
      protocolId,
      txHash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      completedAt: status === 'COMPLETED' ? new Date() : undefined,
    },
  });
}

export function x402ProtocolRegistrationGate() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const skipPaymentGate = process.env.SKIP_X402_PAYMENT_GATE === 'true';
    if (skipPaymentGate) {
      console.log('[x402] Payment gate skipped (SKIP_X402_PAYMENT_GATE=true)');
      return next();
    }

    const paymentReceipt = req.headers['x-payment-receipt'] as string;
    const paymentReceiptJson = req.headers['x-payment-receipt-json'] as string;

    if (!paymentReceipt && !paymentReceiptJson) {
      const paymentTerms = createX402PaymentResponse(
        PROTOCOL_REGISTRATION_FEE,
        'Protocol registration fee'
      );

      // Track the pending payment request
      const requester = req.body.ownerAddress || 'unknown';
      await createPaymentRequest(
        'PROTOCOL_REGISTRATION',
        requester,
        PROTOCOL_REGISTRATION_FEE,
        'PENDING'
      ).catch(err => console.error('[x402] Failed to create payment request:', err));

      return res.status(402).json({
        error: 'Payment Required',
        message: 'Protocol registration requires a 1 USDC payment via x.402',
        x402: paymentTerms,
        instructions: {
          step1: 'Approve USDC spending for the platform escrow contract',
          step2: 'Include X-Payment-Receipt header with transaction hash',
          step3: 'Retry the request with payment proof',
        },
      });
    }

    try {
      let receipt: X402Receipt;

      if (paymentReceiptJson) {
        receipt = JSON.parse(paymentReceiptJson);
      } else {
        receipt = {
          txHash: paymentReceipt,
          amount: PROTOCOL_REGISTRATION_FEE,
          payer: req.body.ownerAddress || '',
          timestamp: new Date().toISOString(),
        };
      }

      const verification = await verifyX402Receipt(receipt, PROTOCOL_REGISTRATION_FEE);

      if (!verification.valid) {
        return res.status(402).json({
          error: 'Invalid Payment',
          message: verification.reason || 'The provided payment receipt is invalid',
          x402: createX402PaymentResponse(
            PROTOCOL_REGISTRATION_FEE,
            'Protocol registration fee'
          ),
        });
      }

      // Track the completed payment
      await createPaymentRequest(
        'PROTOCOL_REGISTRATION',
        receipt.payer,
        PROTOCOL_REGISTRATION_FEE,
        'COMPLETED',
        receipt.txHash
      ).catch(err => console.error('[x402] Failed to create payment request:', err));

      (req as any).x402Receipt = receipt;
      console.log(`[x402] Payment verified for protocol registration: ${receipt.txHash}`);
      next();
    } catch (error) {
      console.error('[x402] Payment verification error:', error);
      return res.status(402).json({
        error: 'Payment Verification Failed',
        message: 'Could not verify the payment receipt',
        x402: createX402PaymentResponse(
          PROTOCOL_REGISTRATION_FEE,
          'Protocol registration fee'
        ),
      });
    }
  };
}

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

export function parseX402Headers(req: Request): {
  hasPayment: boolean;
  receipt?: X402Receipt;
} {
  const paymentReceipt = req.headers['x-payment-receipt'] as string;
  const paymentReceiptJson = req.headers['x-payment-receipt-json'] as string;

  if (!paymentReceipt && !paymentReceiptJson) {
    return { hasPayment: false };
  }

  try {
    if (paymentReceiptJson) {
      return {
        hasPayment: true,
        receipt: JSON.parse(paymentReceiptJson),
      };
    }

    return {
      hasPayment: true,
      receipt: {
        txHash: paymentReceipt,
        amount: '0',
        payer: '',
        timestamp: new Date().toISOString(),
      },
    };
  } catch {
    return { hasPayment: false };
  }
}
