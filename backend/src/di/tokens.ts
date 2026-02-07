/**
 * DI injection tokens for tsyringe container.
 */
export const TOKENS = {
  Logger: 'ILogger',
  Database: 'PrismaClient',
  BountyPoolClient: 'IBountyPoolClient',
  USDCClient: 'IUSDCClient',
  ValidationRegistryClient: 'IValidationRegistryClient',
  ProtocolRegistryClient: 'IProtocolRegistryClient',
} as const;
