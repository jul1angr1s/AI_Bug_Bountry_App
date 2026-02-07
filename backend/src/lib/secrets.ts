/**
 * Secrets Management Abstraction
 *
 * Provides a unified interface for retrieving secrets.
 * In development: reads from environment variables.
 * In production: swap to AWS Secrets Manager, HashiCorp Vault, etc.
 */

export interface SecretsProvider {
  getSecret(name: string): Promise<string>;
  getOptionalSecret(name: string): Promise<string | undefined>;
}

class EnvSecretsProvider implements SecretsProvider {
  async getSecret(name: string): Promise<string> {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Required secret "${name}" not found in environment`);
    }
    return value;
  }

  async getOptionalSecret(name: string): Promise<string | undefined> {
    return process.env[name] || undefined;
  }
}

let provider: SecretsProvider | null = null;

export function getSecretsProvider(): SecretsProvider {
  if (!provider) {
    provider = new EnvSecretsProvider();
  }
  return provider;
}

/**
 * Allow overriding the provider (useful for testing or production providers)
 */
export function setSecretsProvider(p: SecretsProvider): void {
  provider = p;
}
