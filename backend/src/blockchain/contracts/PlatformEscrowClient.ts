import { ethers, Contract, ContractTransactionResponse } from 'ethers';
import { payerWallet, contractAddresses, provider, usdcConfig } from '../config.js';
import { createLogger } from '../../lib/logger.js';

const log = createLogger('PlatformEscrow');

const PLATFORM_ESCROW_ABI = [
  'function depositEscrow(uint256 amount) external',
  'function depositEscrowFor(address agent, uint256 amount) external',
  'function deductSubmissionFee(address agent, bytes32 findingId) external',
  'function collectProtocolFee(address protocol, bytes32 protocolId) external',
  'function withdrawEscrow(uint256 amount) external',
  'function getEscrowBalance(address agent) external view returns (uint256)',
  'function canSubmitFinding(address agent) external view returns (bool)',
  'function getRemainingSubmissions(address agent) external view returns (uint256)',
  'function submissionFee() external view returns (uint256)',
  'function protocolRegistrationFee() external view returns (uint256)',
  'event EscrowDeposited(address indexed agent, uint256 amount, uint256 newBalance)',
  'event SubmissionFeeDeducted(address indexed agent, bytes32 indexed findingId, uint256 feeAmount, uint256 remainingBalance)',
  'event ProtocolFeeCollected(address indexed protocol, bytes32 indexed protocolId, uint256 feeAmount)',
];

const USDC_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

export interface DepositResult {
  txHash: string;
  amount: bigint;
  newBalance: bigint;
  blockNumber: number;
}

export interface FeeDeductionResult {
  txHash: string;
  feeAmount: bigint;
  remainingBalance: bigint;
  blockNumber: number;
}

export class PlatformEscrowClient {
  private contract: Contract;
  private readOnlyContract: Contract;
  private usdcContract: Contract;
  private usdcReadOnly: Contract;

  constructor() {
    if (!contractAddresses.platformEscrow) {
      throw new Error('PLATFORM_ESCROW_ADDRESS not set in environment');
    }

    this.contract = new Contract(
      contractAddresses.platformEscrow,
      PLATFORM_ESCROW_ABI,
      payerWallet
    );

    this.readOnlyContract = new Contract(
      contractAddresses.platformEscrow,
      PLATFORM_ESCROW_ABI,
      provider
    );

    this.usdcContract = new Contract(
      usdcConfig.address,
      USDC_ABI,
      payerWallet
    );

    this.usdcReadOnly = new Contract(
      usdcConfig.address,
      USDC_ABI,
      provider
    );
  }

  async depositEscrowFor(
    agentAddress: string,
    amount: bigint
  ): Promise<DepositResult> {
    log.info({ agentAddress, amount: ethers.formatUnits(amount, usdcConfig.decimals) }, 'Depositing escrow on-chain...');

    // Check USDC allowance and approve if needed
    const allowance = await this.usdcReadOnly.allowance(
      payerWallet.address,
      contractAddresses.platformEscrow
    );

    if (allowance < amount) {
      log.info('Approving USDC spend...');
      const approveTx: ContractTransactionResponse = await this.usdcContract.approve(
        contractAddresses.platformEscrow,
        amount
      );
      await approveTx.wait();
    }

    const tx: ContractTransactionResponse = await this.contract.depositEscrowFor(
      agentAddress,
      amount
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error('Transaction receipt is null');

    // Parse EscrowDeposited event
    let newBalance = BigInt(0);
    for (const log of receipt.logs) {
      try {
        const parsed = this.contract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed?.name === 'EscrowDeposited') {
          newBalance = parsed.args[2];
          break;
        }
      } catch {
        // Not our event, skip
      }
    }

    log.info({ txHash: tx.hash }, 'Deposit complete');

    return {
      txHash: tx.hash,
      amount,
      newBalance,
      blockNumber: receipt.blockNumber,
    };
  }

  async deductSubmissionFee(
    agentAddress: string,
    findingId: string
  ): Promise<FeeDeductionResult> {
    log.info('Deducting submission fee on-chain...');

    const findingIdBytes32 = ethers.zeroPadValue(
      ethers.toBeHex(findingId.startsWith('0x') ? findingId : ethers.id(findingId)),
      32
    );

    const tx: ContractTransactionResponse = await this.contract.deductSubmissionFee(
      agentAddress,
      findingIdBytes32
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error('Transaction receipt is null');

    // Parse SubmissionFeeDeducted event
    let feeAmount = BigInt(0);
    let remainingBalance = BigInt(0);
    for (const log of receipt.logs) {
      try {
        const parsed = this.contract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed?.name === 'SubmissionFeeDeducted') {
          feeAmount = parsed.args[2];
          remainingBalance = parsed.args[3];
          break;
        }
      } catch {
        // Not our event, skip
      }
    }

    return {
      txHash: tx.hash,
      feeAmount,
      remainingBalance,
      blockNumber: receipt.blockNumber,
    };
  }

  async getBalance(walletAddress: string): Promise<bigint> {
    try {
      return await this.readOnlyContract.getEscrowBalance(walletAddress);
    } catch {
      return BigInt(0);
    }
  }

  async canSubmitFinding(walletAddress: string): Promise<boolean> {
    try {
      return await this.readOnlyContract.canSubmitFinding(walletAddress);
    } catch {
      return false;
    }
  }

  async getSubmissionFee(): Promise<bigint> {
    try {
      return await this.readOnlyContract.submissionFee();
    } catch {
      return BigInt(500000); // 0.5 USDC default
    }
  }

  async getProtocolRegistrationFee(): Promise<bigint> {
    try {
      return await this.readOnlyContract.protocolRegistrationFee();
    } catch {
      return BigInt(1000000); // 1 USDC default
    }
  }

  async verifyUsdcTransfer(
    txHash: string,
    expectedRecipient: string,
    expectedMinAmount: bigint
  ): Promise<{ valid: boolean; actualAmount: bigint; sender: string }> {
    const txReceipt = await provider.getTransactionReceipt(txHash);

    if (!txReceipt || txReceipt.status !== 1) {
      return { valid: false, actualAmount: BigInt(0), sender: '' };
    }

    const transferTopic = ethers.id('Transfer(address,address,uint256)');
    const usdcAddress = usdcConfig.address.toLowerCase();
    const recipient = expectedRecipient.toLowerCase();

    for (const log of txReceipt.logs) {
      if (log.address.toLowerCase() !== usdcAddress) continue;
      if (log.topics[0] !== transferTopic) continue;

      const from = ethers.getAddress('0x' + log.topics[1].slice(26));
      const to = ethers.getAddress('0x' + log.topics[2].slice(26)).toLowerCase();
      const value = BigInt(log.data);

      if (to === recipient && value >= expectedMinAmount) {
        return { valid: true, actualAmount: value, sender: from };
      }
    }

    return { valid: false, actualAmount: BigInt(0), sender: '' };
  }

  getAddress(): string {
    return contractAddresses.platformEscrow;
  }
}
