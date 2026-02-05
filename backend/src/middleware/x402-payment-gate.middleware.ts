import { Request, Response, NextFunction } from 'express';
import { escrowService } from '../services/escrow.service.js';

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

async function verifyX402Receipt(receipt: X402Receipt): Promise<boolean> {
  if (!receipt.txHash || !receipt.amount || !receipt.payer) {
    return false;
  }

  const isValidFormat = /^0x[a-fA-F0-9]{64}$/.test(receipt.txHash);
  if (!isValidFormat) {
    return false;
  }

  return true;
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

      const isValid = await verifyX402Receipt(receipt);

      if (!isValid) {
        return res.status(402).json({
          error: 'Invalid Payment',
          message: 'The provided payment receipt is invalid',
          x402: createX402PaymentResponse(
            PROTOCOL_REGISTRATION_FEE,
            'Protocol registration fee'
          ),
        });
      }

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
