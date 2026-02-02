import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createProtocol } from '../../lib/api';
import type { CreateProtocolRequest } from '../../lib/api';

/**
 * Integration Test: Protocol Registration
 *
 * This test replicates the "Failed to fetch" error that occurs when
 * trying to register a protocol through the registration form.
 *
 * Possible causes:
 * 1. User not authenticated (no Supabase session)
 * 2. CORS preflight request failing
 * 3. Backend not responding
 * 4. Network connectivity issue
 */
describe('Integration: Protocol Registration Error', () => {
  beforeEach(() => {
    // Reset fetch mock
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw error when user is not authenticated', async () => {
    // Arrange: Mock Supabase to return no session
    vi.mock('../../lib/supabase', () => ({
      supabase: {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: null, // No active session
            },
          }),
        },
      },
    }));

    const protocolData: CreateProtocolRequest = {
      name: 'Thunder Loan Protocol',
      githubUrl: 'https://github.com/Cyfrin/2023-11-Thunder-Loan',
      branch: 'main',
      contractPath: 'src/protocol/ThunderLoan.sol',
      contractName: 'ThunderLoan',
      bountyPoolAddress: '0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0',
      network: 'base-sepolia',
    };

    // Act & Assert: Should throw "No active session" error
    await expect(createProtocol(protocolData)).rejects.toThrow('No active session');
  });

  it('should throw error when fetch fails due to network issue', async () => {
    // Arrange: Mock Supabase to return valid session
    vi.mock('../../lib/supabase', () => ({
      supabase: {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                access_token: 'valid-token-123',
                user: { id: 'user-1', email: 'test@example.com' },
              },
            },
          }),
        },
      },
    }));

    // Mock fetch to fail with network error
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const protocolData: CreateProtocolRequest = {
      name: 'Thunder Loan Protocol',
      githubUrl: 'https://github.com/Cyfrin/2023-11-Thunder-Loan',
      branch: 'main',
      contractPath: 'src/protocol/ThunderLoan.sol',
      contractName: 'ThunderLoan',
      bountyPoolAddress: '0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0',
      network: 'base-sepolia',
    };

    // Act & Assert: Should throw "Failed to fetch" error
    await expect(createProtocol(protocolData)).rejects.toThrow('Failed to fetch');
  });

  it('should throw error when CORS preflight fails', async () => {
    // Arrange: Mock Supabase to return valid session
    vi.mock('../../lib/supabase', () => ({
      supabase: {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                access_token: 'valid-token-123',
                user: { id: 'user-1', email: 'test@example.com' },
              },
            },
          }),
        },
      },
    }));

    // Mock fetch to fail with CORS error (also manifests as "Failed to fetch")
    global.fetch = vi.fn().mockRejectedValue(
      new TypeError('Failed to fetch') // CORS errors appear as generic fetch failures
    );

    const protocolData: CreateProtocolRequest = {
      name: 'Thunder Loan Protocol',
      githubUrl: 'https://github.com/Cyfrin/2023-11-Thunder-Loan',
      branch: 'main',
      contractPath: 'src/protocol/ThunderLoan.sol',
      contractName: 'ThunderLoan',
      bountyPoolAddress: '0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0',
      network: 'base-sepolia',
    };

    // Act & Assert
    await expect(createProtocol(protocolData)).rejects.toThrow('Failed to fetch');
  });

  it('should successfully register protocol when authenticated and backend is available', async () => {
    // Arrange: Mock successful authentication and API response
    vi.mock('../../lib/supabase', () => ({
      supabase: {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                access_token: 'valid-token-123',
                user: { id: 'user-1', email: 'test@example.com' },
              },
            },
          }),
        },
      },
    }));

    // Mock successful fetch response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'protocol-1',
        name: 'Thunder Loan Protocol',
        status: 'PENDING',
        message: 'Protocol registered successfully and queued for analysis',
      }),
    } as Response);

    const protocolData: CreateProtocolRequest = {
      name: 'Thunder Loan Protocol',
      githubUrl: 'https://github.com/Cyfrin/2023-11-Thunder-Loan',
      branch: 'main',
      contractPath: 'src/protocol/ThunderLoan.sol',
      contractName: 'ThunderLoan',
      bountyPoolAddress: '0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0',
      network: 'base-sepolia',
    };

    // Act
    const response = await createProtocol(protocolData);

    // Assert
    expect(response).toBeDefined();
    expect(response.id).toBe('protocol-1');
    expect(response.name).toBe('Thunder Loan Protocol');
    expect(response.status).toBe('PENDING');
    expect(response.message).toContain('registered successfully');

    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/protocols'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token-123',
        }),
        body: expect.any(String),
      })
    );
  });
});
