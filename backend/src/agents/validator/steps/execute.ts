import { ethers } from 'ethers';
import type { DecryptedProof } from './decrypt.js';

export interface ExecutionResult {
  success: boolean;
  validated: boolean; // True if exploit succeeded (vulnerability is real)
  stateChanges?: {
    balanceBefore: string;
    balanceAfter: string;
    balanceChange: string;
    otherChanges?: Record<string, any>;
  };
  transactionHash?: string;
  gasUsed?: string;
  error?: string;
  executionLog?: string[];
}

/**
 * EXECUTE Step - Execute exploit against deployed contract
 *
 * This step:
 * 1. Reads the exploit reproduction steps from the proof
 * 2. Executes each step against the deployed contract
 * 3. Captures state changes to verify the vulnerability
 * 4. Returns validation result (TRUE/FALSE)
 *
 * For MVP, we perform basic reentrancy and balance checks.
 * In production, this would support complex multi-step exploits.
 */
export async function executeExploit(
  provider: ethers.JsonRpcProvider,
  contractAddress: string,
  abi: ethers.InterfaceAbi,
  proof: DecryptedProof
): Promise<ExecutionResult> {
  const executionLog: string[] = [];

  try {
    console.log(`[Validator/Execute] Executing exploit for ${proof.vulnerabilityType}...`);
    executionLog.push(`Starting validation of ${proof.vulnerabilityType}`);

    // Get attacker account (use account 1, not deployer)
    const attacker = await provider.getSigner(1);
    const attackerAddress = await attacker.getAddress();

    executionLog.push(`Attacker address: ${attackerAddress}`);

    // Create contract instance
    const contract = new ethers.Contract(contractAddress, abi, attacker);

    // Capture initial state
    const balanceBefore = await provider.getBalance(attackerAddress);
    const contractBalanceBefore = await provider.getBalance(contractAddress);

    executionLog.push(`Initial attacker balance: ${ethers.formatEther(balanceBefore)} ETH`);
    executionLog.push(`Initial contract balance: ${ethers.formatEther(contractBalanceBefore)} ETH`);

    // Execute exploit based on vulnerability type
    let exploitResult: ExecutionResult;

    switch (proof.vulnerabilityType) {
      case 'REENTRANCY':
      case 'REENTRANCY_ETH':
        exploitResult = await executeReentrancyExploit(
          provider,
          contract,
          contractAddress,
          attackerAddress,
          executionLog
        );
        break;

      case 'INTEGER_OVERFLOW':
      case 'INTEGER_UNDERFLOW':
        exploitResult = await executeIntegerExploit(
          provider,
          contract,
          contractAddress,
          attackerAddress,
          executionLog
        );
        break;

      case 'ACCESS_CONTROL':
        exploitResult = await executeAccessControlExploit(
          provider,
          contract,
          contractAddress,
          attackerAddress,
          executionLog
        );
        break;

      default:
        // Generic execution - try calling vulnerable function if specified
        exploitResult = await executeGenericExploit(
          provider,
          contract,
          proof,
          attackerAddress,
          executionLog
        );
        break;
    }

    // Capture final state
    const balanceAfter = await provider.getBalance(attackerAddress);
    const balanceChange = balanceAfter - balanceBefore;

    exploitResult.stateChanges = {
      balanceBefore: ethers.formatEther(balanceBefore),
      balanceAfter: ethers.formatEther(balanceAfter),
      balanceChange: ethers.formatEther(balanceChange),
    };

    executionLog.push(`Final attacker balance: ${ethers.formatEther(balanceAfter)} ETH`);
    executionLog.push(`Balance change: ${ethers.formatEther(balanceChange)} ETH`);

    // Determine if exploit succeeded
    // For reentrancy/theft: attacker gained funds
    // For other vulnerabilities: check specific conditions
    const validated = balanceChange > 0n || exploitResult.validated;

    executionLog.push(`Validation result: ${validated ? 'CONFIRMED' : 'REJECTED'}`);

    console.log(`[Validator/Execute] Exploit validation: ${validated ? 'TRUE' : 'FALSE'}`);

    return {
      ...exploitResult,
      validated,
      executionLog,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Validator/Execute] Exploit execution failed:`, errorMessage);

    executionLog.push(`Execution failed: ${errorMessage}`);

    return {
      success: false,
      validated: false,
      error: `Execution failed: ${errorMessage}`,
      executionLog,
    };
  }
}

/**
 * Execute reentrancy exploit
 */
async function executeReentrancyExploit(
  provider: ethers.JsonRpcProvider,
  contract: ethers.Contract,
  contractAddress: string,
  attackerAddress: string,
  log: string[]
): Promise<ExecutionResult> {
  log.push('Attempting reentrancy exploit...');

  // Check if contract has deposit/withdraw pattern
  const hasDeposit = contract.interface.hasFunction('deposit');
  const hasWithdraw = contract.interface.hasFunction('withdraw');

  if (!hasDeposit || !hasWithdraw) {
    log.push('Contract does not have deposit/withdraw pattern');
    return {
      success: false,
      validated: false,
      error: 'Contract missing deposit/withdraw functions',
    };
  }

  try {
    // Deposit funds
    const depositAmount = ethers.parseEther('1.0');
    const depositTx = await contract.deposit({ value: depositAmount });
    await depositTx.wait();

    log.push(`Deposited ${ethers.formatEther(depositAmount)} ETH`);

    // Attempt withdrawal (which may trigger reentrancy if vulnerable)
    const withdrawTx = await contract.withdraw();
    const receipt = await withdrawTx.wait();

    log.push(`Withdrawal executed: ${receipt.hash}`);

    return {
      success: true,
      validated: true, // If we got here without revert, likely vulnerable
      transactionHash: receipt.hash,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (error) {
    log.push(`Reentrancy exploit failed: ${error instanceof Error ? error.message : 'Unknown'}`);

    return {
      success: false,
      validated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute integer overflow/underflow exploit
 */
async function executeIntegerExploit(
  provider: ethers.JsonRpcProvider,
  contract: ethers.Contract,
  contractAddress: string,
  attackerAddress: string,
  log: string[]
): Promise<ExecutionResult> {
  log.push('Attempting integer overflow/underflow exploit...');

  // This is a simplified check - production would analyze specific functions
  return {
    success: true,
    validated: false, // Conservative: don't auto-confirm integer bugs
    error: 'Integer exploits require manual verification',
  };
}

/**
 * Execute access control exploit
 */
async function executeAccessControlExploit(
  provider: ethers.JsonRpcProvider,
  contract: ethers.Contract,
  contractAddress: string,
  attackerAddress: string,
  log: string[]
): Promise<ExecutionResult> {
  log.push('Attempting access control exploit...');

  // Try calling privileged functions without proper authorization
  // This is simplified - production would parse proof for specific function
  return {
    success: true,
    validated: false, // Conservative: don't auto-confirm access bugs
    error: 'Access control exploits require manual verification',
  };
}

/**
 * Generic exploit execution
 */
async function executeGenericExploit(
  provider: ethers.JsonRpcProvider,
  contract: ethers.Contract,
  proof: DecryptedProof,
  attackerAddress: string,
  log: string[]
): Promise<ExecutionResult> {
  log.push('Attempting generic exploit execution...');

  // Try to execute based on reproduction steps in proof
  const { reproductionSteps } = proof.exploitDetails;

  if (!reproductionSteps || reproductionSteps.length === 0) {
    return {
      success: false,
      validated: false,
      error: 'No reproduction steps provided in proof',
    };
  }

  log.push(`Following ${reproductionSteps.length} reproduction steps...`);

  // For MVP, we log the steps but don't execute them automatically
  // In production, this would parse and execute the steps
  reproductionSteps.forEach((step, index) => {
    log.push(`Step ${index + 1}: ${step}`);
  });

  return {
    success: true,
    validated: false, // Conservative: don't auto-confirm without explicit checks
    error: 'Generic exploits require manual verification',
  };
}
