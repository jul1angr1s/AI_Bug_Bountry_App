import { z } from 'zod';

export const protocolRegistrationSchema = z.object({
  githubUrl: z.string().url({ message: 'Invalid GitHub URL' }),
  branch: z.string().min(1, { message: 'Branch is required' }).default('main'),
  contractPath: z.string().min(1, { message: 'Contract path is required' }),
  contractName: z.string().min(1, { message: 'Contract name is required' }),
  bountyTerms: z.string().min(1, { message: 'Bounty terms are required' }),
  ownerAddress: z.string().min(1, { message: 'Owner address is required' }),
});

export const protocolFundingSchema = z.object({
  amount: z.number().positive({ message: 'Amount must be positive' }),
  currency: z.string().default('ETH'),
  txHash: z.string().min(1, { message: 'Transaction hash is required' }),
});

export const agentCommandSchema = z.object({
  command: z.enum(['PAUSE', 'RESUME', 'STOP']),
  reason: z.string().optional(),
});

export const protocolIdSchema = z.object({
  id: z.string().uuid({ message: 'Invalid protocol ID' }),
});

export type ProtocolRegistrationInput = z.infer<typeof protocolRegistrationSchema>;
export type ProtocolFundingInput = z.infer<typeof protocolFundingSchema>;
export type AgentCommandInput = z.infer<typeof agentCommandSchema>;
export type ProtocolIdParams = z.infer<typeof protocolIdSchema>;
