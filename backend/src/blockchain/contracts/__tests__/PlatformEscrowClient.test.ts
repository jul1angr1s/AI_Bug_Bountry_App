import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks (available in vi.mock factories) ────────────────────────────

const {
  mockPayerWallet,
  mockProvider,
  mockEscrowContract,
  mockReadOnlyEscrowContract,
  mockUsdcContract,
  mockUsdcReadOnlyContract,
  callCounter,
} = vi.hoisted(() => {
  const mockPayerWallet = {
    address: '0xPayerWalletAddress',
  };

  const mockProvider = {
    getTransactionReceipt: vi.fn(),
  };

  const mockEscrowContract: Record<string, any> = {
    depositEscrowFor: vi.fn(),
    deductSubmissionFee: vi.fn(),
    getEscrowBalance: vi.fn(),
    canSubmitFinding: vi.fn(),
    submissionFee: vi.fn(),
    protocolRegistrationFee: vi.fn(),
    interface: {
      parseLog: vi.fn(),
      parseError: vi.fn(),
    },
  };

  const mockReadOnlyEscrowContract: Record<string, any> = {
    depositEscrowFor: vi.fn(),
    deductSubmissionFee: vi.fn(),
    getEscrowBalance: vi.fn(),
    canSubmitFinding: vi.fn(),
    submissionFee: vi.fn(),
    protocolRegistrationFee: vi.fn(),
    interface: {
      parseLog: vi.fn(),
      parseError: vi.fn(),
    },
  };

  const mockUsdcContract: Record<string, any> = {
    approve: vi.fn(),
    allowance: vi.fn(),
    balanceOf: vi.fn(),
    transfer: vi.fn(),
  };

  const mockUsdcReadOnlyContract: Record<string, any> = {
    approve: vi.fn(),
    allowance: vi.fn(),
    balanceOf: vi.fn(),
    transfer: vi.fn(),
  };

  const callCounter = { value: 0 };

  return {
    mockPayerWallet,
    mockProvider,
    mockEscrowContract,
    mockReadOnlyEscrowContract,
    mockUsdcContract,
    mockUsdcReadOnlyContract,
    callCounter,
  };
});

// ── Module-level mocks ────────────────────────────────────────────────────────

vi.mock('../../config.js', () => ({
  payerWallet: mockPayerWallet,
  provider: mockProvider,
  contractAddresses: { platformEscrow: '0xPlatformEscrowAddress' },
  usdcConfig: { decimals: 6, address: '0xUSDCAddress', symbol: 'USDC' },
}));

vi.mock('ethers', async () => {
  const actual = await vi.importActual('ethers');
  return {
    ...actual,
    Contract: vi.fn(() => {
      callCounter.value++;
      switch (callCounter.value % 4) {
        case 1: return mockEscrowContract;
        case 2: return mockReadOnlyEscrowContract;
        case 3: return mockUsdcContract;
        case 0: return mockUsdcReadOnlyContract;
        default: return mockEscrowContract;
      }
    }),
  };
});

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { PlatformEscrowClient } from '../PlatformEscrowClient.js';
import { contractAddresses } from '../../config.js';
import { Contract } from 'ethers';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTxResponse(hash: string) {
  return {
    hash,
    wait: vi.fn(),
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('PlatformEscrowClient', () => {
  let client: PlatformEscrowClient;

  beforeEach(() => {
    vi.clearAllMocks();
    callCounter.value = 0;
    client = new PlatformEscrowClient();
  });

  // ─── Constructor ──────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('should create 4 Contract instances (escrow + readOnly + usdc + usdcReadOnly)', () => {
      expect(Contract).toHaveBeenCalledTimes(4);
    });

    it('should create escrow contract with the platformEscrow address', () => {
      expect(Contract).toHaveBeenCalledWith(
        '0xPlatformEscrowAddress',
        expect.anything(),
        mockPayerWallet,
      );
    });

    it('should create read-only escrow contract with provider', () => {
      expect(Contract).toHaveBeenCalledWith(
        '0xPlatformEscrowAddress',
        expect.anything(),
        mockProvider,
      );
    });

    it('should throw when PLATFORM_ESCROW_ADDRESS is not set', () => {
      const original = contractAddresses.platformEscrow;
      try {
        (contractAddresses as Record<string, string>).platformEscrow = '';
        expect(() => new PlatformEscrowClient()).toThrow('PLATFORM_ESCROW_ADDRESS not set');
      } finally {
        (contractAddresses as Record<string, string>).platformEscrow = original;
      }
    });
  });

  // ─── depositEscrowFor ─────────────────────────────────────────────────────

  describe('depositEscrowFor', () => {
    it('should approve USDC and call depositEscrowFor when allowance is insufficient', async () => {
      // Allowance is less than amount
      mockUsdcReadOnlyContract.allowance.mockResolvedValue(BigInt(0));

      const approveTx = makeTxResponse('0xApproveTx');
      approveTx.wait.mockResolvedValue({});
      mockUsdcContract.approve.mockResolvedValue(approveTx);

      const depositTx = makeTxResponse('0xDepositTx');
      const receipt = {
        hash: '0xDepositTxHash',
        blockNumber: 100,
        logs: [
          { topics: ['0xEscrowDepositTopic'] as string[], data: '0xEventData' },
        ],
      };
      depositTx.wait.mockResolvedValue(receipt);
      mockEscrowContract.depositEscrowFor.mockResolvedValue(depositTx);

      // Parse the EscrowDeposited event
      mockEscrowContract.interface.parseLog.mockReturnValue({
        name: 'EscrowDeposited',
        args: ['0xAgent', BigInt(5_000_000), BigInt(10_000_000)],
      });

      const result = await client.depositEscrowFor('0xAgent', BigInt(5_000_000));

      expect(mockUsdcContract.approve).toHaveBeenCalled();
      expect(mockEscrowContract.depositEscrowFor).toHaveBeenCalledWith('0xAgent', BigInt(5_000_000));
      expect(result.txHash).toBe('0xDepositTx');
      expect(result.amount).toBe(BigInt(5_000_000));
      expect(result.blockNumber).toBe(100);
    });

    it('should skip USDC approval when allowance is sufficient', async () => {
      // Allowance is sufficient
      mockUsdcReadOnlyContract.allowance.mockResolvedValue(BigInt(10_000_000));

      const depositTx = makeTxResponse('0xDepositTx');
      const receipt = {
        hash: '0xDepositTxHash',
        blockNumber: 101,
        logs: [],
      };
      depositTx.wait.mockResolvedValue(receipt);
      mockEscrowContract.depositEscrowFor.mockResolvedValue(depositTx);

      mockEscrowContract.interface.parseLog.mockImplementation(() => {
        throw new Error('no event');
      });

      await client.depositEscrowFor('0xAgent', BigInt(5_000_000));

      expect(mockUsdcContract.approve).not.toHaveBeenCalled();
    });

    it('should throw when the transaction receipt is null', async () => {
      mockUsdcReadOnlyContract.allowance.mockResolvedValue(BigInt(10_000_000));

      const depositTx = makeTxResponse('0xNullReceipt');
      depositTx.wait.mockResolvedValue(null);
      mockEscrowContract.depositEscrowFor.mockResolvedValue(depositTx);

      await expect(
        client.depositEscrowFor('0xAgent', BigInt(5_000_000)),
      ).rejects.toThrow('Transaction receipt is null');
    });

    it('should return newBalance of 0 when EscrowDeposited event is not found', async () => {
      mockUsdcReadOnlyContract.allowance.mockResolvedValue(BigInt(10_000_000));

      const depositTx = makeTxResponse('0xDepositTx');
      const receipt = {
        hash: '0xDepositTxHash',
        blockNumber: 102,
        logs: [{ topics: ['0xSomeTopic'] as string[], data: '0xData' }],
      };
      depositTx.wait.mockResolvedValue(receipt);
      mockEscrowContract.depositEscrowFor.mockResolvedValue(depositTx);

      // parseLog throws for non-matching events
      mockEscrowContract.interface.parseLog.mockImplementation(() => {
        throw new Error('not our event');
      });

      const result = await client.depositEscrowFor('0xAgent', BigInt(5_000_000));

      expect(result.newBalance).toBe(BigInt(0));
    });
  });

  // ─── deductSubmissionFee ──────────────────────────────────────────────────

  describe('deductSubmissionFee', () => {
    it('should call deductSubmissionFee on the contract and return the result', async () => {
      const tx = makeTxResponse('0xDeductTx');
      const receipt = {
        hash: '0xDeductTxHash',
        blockNumber: 200,
        logs: [
          { topics: ['0xDeductTopic'] as string[], data: '0xDeductData' },
        ],
      };
      tx.wait.mockResolvedValue(receipt);
      mockEscrowContract.deductSubmissionFee.mockResolvedValue(tx);

      mockEscrowContract.interface.parseLog.mockReturnValue({
        name: 'SubmissionFeeDeducted',
        args: ['0xAgent', '0xFindingId', BigInt(500_000), BigInt(4_500_000)],
      });

      const result = await client.deductSubmissionFee('0xAgent', 'finding-1');

      expect(result.txHash).toBe('0xDeductTx');
      expect(result.feeAmount).toBe(BigInt(500_000));
      expect(result.remainingBalance).toBe(BigInt(4_500_000));
      expect(result.blockNumber).toBe(200);
    });

    it('should throw when the transaction receipt is null', async () => {
      const tx = makeTxResponse('0xNullReceipt');
      tx.wait.mockResolvedValue(null);
      mockEscrowContract.deductSubmissionFee.mockResolvedValue(tx);

      await expect(
        client.deductSubmissionFee('0xAgent', 'finding-1'),
      ).rejects.toThrow('Transaction receipt is null');
    });

    it('should return zero feeAmount and remainingBalance when event is not found', async () => {
      const tx = makeTxResponse('0xDeductTx');
      const receipt = {
        hash: '0xDeductTxHash',
        blockNumber: 201,
        logs: [{ topics: ['0xOtherTopic'] as string[], data: '0xOtherData' }],
      };
      tx.wait.mockResolvedValue(receipt);
      mockEscrowContract.deductSubmissionFee.mockResolvedValue(tx);

      mockEscrowContract.interface.parseLog.mockImplementation(() => {
        throw new Error('not our event');
      });

      const result = await client.deductSubmissionFee('0xAgent', 'finding-1');

      expect(result.feeAmount).toBe(BigInt(0));
      expect(result.remainingBalance).toBe(BigInt(0));
    });

    it('should convert findingId to bytes32', async () => {
      const tx = makeTxResponse('0xDeductTx');
      const receipt = {
        hash: '0xDeductTxHash',
        blockNumber: 202,
        logs: [],
      };
      tx.wait.mockResolvedValue(receipt);
      mockEscrowContract.deductSubmissionFee.mockResolvedValue(tx);

      await client.deductSubmissionFee('0xAgent', 'my-finding-id');

      // The contract should receive the agent address and a bytes32 value
      expect(mockEscrowContract.deductSubmissionFee).toHaveBeenCalledWith(
        '0xAgent',
        expect.stringMatching(/^0x[0-9a-fA-F]{64}$/),
      );
    });
  });

  // ─── getBalance ───────────────────────────────────────────────────────────

  describe('getBalance', () => {
    it('should return the escrow balance for a wallet', async () => {
      mockReadOnlyEscrowContract.getEscrowBalance.mockResolvedValue(BigInt(5_000_000));

      const result = await client.getBalance('0xWallet');

      expect(result).toBe(BigInt(5_000_000));
      expect(mockReadOnlyEscrowContract.getEscrowBalance).toHaveBeenCalledWith('0xWallet');
    });

    it('should return 0 when the contract call fails', async () => {
      mockReadOnlyEscrowContract.getEscrowBalance.mockRejectedValue(new Error('network error'));

      const result = await client.getBalance('0xWallet');

      expect(result).toBe(BigInt(0));
    });

    it('should return 0 for a wallet with no balance', async () => {
      mockReadOnlyEscrowContract.getEscrowBalance.mockResolvedValue(BigInt(0));

      const result = await client.getBalance('0xEmptyWallet');

      expect(result).toBe(BigInt(0));
    });
  });

  // ─── canSubmitFinding ─────────────────────────────────────────────────────

  describe('canSubmitFinding', () => {
    it('should return true when the wallet has sufficient escrow', async () => {
      mockReadOnlyEscrowContract.canSubmitFinding.mockResolvedValue(true);

      const result = await client.canSubmitFinding('0xWallet');

      expect(result).toBe(true);
      expect(mockReadOnlyEscrowContract.canSubmitFinding).toHaveBeenCalledWith('0xWallet');
    });

    it('should return false when the wallet has insufficient escrow', async () => {
      mockReadOnlyEscrowContract.canSubmitFinding.mockResolvedValue(false);

      const result = await client.canSubmitFinding('0xWallet');

      expect(result).toBe(false);
    });

    it('should return false when the contract call fails', async () => {
      mockReadOnlyEscrowContract.canSubmitFinding.mockRejectedValue(new Error('network error'));

      const result = await client.canSubmitFinding('0xWallet');

      expect(result).toBe(false);
    });
  });

  // ─── getSubmissionFee ─────────────────────────────────────────────────────

  describe('getSubmissionFee', () => {
    it('should return the submission fee from the contract', async () => {
      mockReadOnlyEscrowContract.submissionFee.mockResolvedValue(BigInt(500_000));

      const result = await client.getSubmissionFee();

      expect(result).toBe(BigInt(500_000));
    });

    it('should return default 0.5 USDC when the contract call fails', async () => {
      mockReadOnlyEscrowContract.submissionFee.mockRejectedValue(new Error('network error'));

      const result = await client.getSubmissionFee();

      expect(result).toBe(BigInt(500_000));
    });
  });

  // ─── getProtocolRegistrationFee ───────────────────────────────────────────

  describe('getProtocolRegistrationFee', () => {
    it('should return the protocol registration fee from the contract', async () => {
      mockReadOnlyEscrowContract.protocolRegistrationFee.mockResolvedValue(BigInt(1_000_000));

      const result = await client.getProtocolRegistrationFee();

      expect(result).toBe(BigInt(1_000_000));
    });

    it('should return default 1 USDC when the contract call fails', async () => {
      mockReadOnlyEscrowContract.protocolRegistrationFee.mockRejectedValue(new Error('network error'));

      const result = await client.getProtocolRegistrationFee();

      expect(result).toBe(BigInt(1_000_000));
    });
  });

  // ─── verifyUsdcTransfer ───────────────────────────────────────────────────

  describe('verifyUsdcTransfer', () => {
    it('should return valid=true when a matching USDC Transfer event is found', async () => {
      const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      const sender = '0x1111111111111111111111111111111111111111';
      const recipient = '0x2222222222222222222222222222222222222222';

      const senderTopic = '0x000000000000000000000000' + sender.slice(2);
      const recipientTopic = '0x000000000000000000000000' + recipient.slice(2);

      const amount = BigInt(5_000_000);
      const amountHex = '0x' + amount.toString(16).padStart(64, '0');

      mockProvider.getTransactionReceipt.mockResolvedValue({
        status: 1,
        logs: [
          {
            address: '0xUSDCAddress',
            topics: [transferTopic, senderTopic, recipientTopic],
            data: amountHex,
          },
        ],
      });

      const result = await client.verifyUsdcTransfer(
        '0xTxHash',
        recipient,
        BigInt(1_000_000),
      );

      expect(result.valid).toBe(true);
      expect(result.actualAmount).toBe(amount);
    });

    it('should return valid=false when transaction receipt is null', async () => {
      mockProvider.getTransactionReceipt.mockResolvedValue(null);

      const result = await client.verifyUsdcTransfer(
        '0xBadTxHash',
        '0x2222222222222222222222222222222222222222',
        BigInt(1_000_000),
      );

      expect(result.valid).toBe(false);
      expect(result.actualAmount).toBe(BigInt(0));
      expect(result.sender).toBe('');
    });

    it('should return valid=false when transaction status is 0 (failed)', async () => {
      mockProvider.getTransactionReceipt.mockResolvedValue({
        status: 0,
        logs: [],
      });

      const result = await client.verifyUsdcTransfer(
        '0xFailedTxHash',
        '0x2222222222222222222222222222222222222222',
        BigInt(1_000_000),
      );

      expect(result.valid).toBe(false);
    });

    it('should return valid=false when transfer amount is below minimum', async () => {
      const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      const sender = '0x1111111111111111111111111111111111111111';
      const recipient = '0x2222222222222222222222222222222222222222';
      const senderTopic = '0x000000000000000000000000' + sender.slice(2);
      const recipientTopic = '0x000000000000000000000000' + recipient.slice(2);

      const amount = BigInt(100);
      const amountHex = '0x' + amount.toString(16).padStart(64, '0');

      mockProvider.getTransactionReceipt.mockResolvedValue({
        status: 1,
        logs: [
          {
            address: '0xUSDCAddress',
            topics: [transferTopic, senderTopic, recipientTopic],
            data: amountHex,
          },
        ],
      });

      const result = await client.verifyUsdcTransfer(
        '0xTxHash',
        recipient,
        BigInt(1_000_000),
      );

      expect(result.valid).toBe(false);
    });

    it('should return valid=false when log is from a different contract', async () => {
      const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      const sender = '0x1111111111111111111111111111111111111111';
      const recipient = '0x2222222222222222222222222222222222222222';
      const senderTopic = '0x000000000000000000000000' + sender.slice(2);
      const recipientTopic = '0x000000000000000000000000' + recipient.slice(2);

      const amount = BigInt(5_000_000);
      const amountHex = '0x' + amount.toString(16).padStart(64, '0');

      mockProvider.getTransactionReceipt.mockResolvedValue({
        status: 1,
        logs: [
          {
            address: '0xDifferentToken',
            topics: [transferTopic, senderTopic, recipientTopic],
            data: amountHex,
          },
        ],
      });

      const result = await client.verifyUsdcTransfer(
        '0xTxHash',
        recipient,
        BigInt(1_000_000),
      );

      expect(result.valid).toBe(false);
    });
  });

  // ─── getAddress ───────────────────────────────────────────────────────────

  describe('getAddress', () => {
    it('should return the platform escrow contract address from config', () => {
      const address = client.getAddress();

      expect(address).toBe('0xPlatformEscrowAddress');
    });
  });
});
