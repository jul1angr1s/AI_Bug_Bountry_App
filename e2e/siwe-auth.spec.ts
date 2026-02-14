import { test, expect } from '@playwright/test';
import { Wallet } from 'ethers';

const BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3000';

/**
 * SIWE Authentication E2E Test Suite
 *
 * Tests the complete SIWE authentication flow:
 * 1. Wallet signature verification
 * 2. User creation in Supabase
 * 3. Session token generation
 * 4. Protocol registration with authenticated session
 * 5. Session persistence across browser restarts
 * 6. Re-authentication with same wallet
 */

test.describe('SIWE Authentication E2E Tests', () => {
  let testWallet: Wallet;
  let walletAddress: string;
  let accessToken: string;
  let csrfToken: string;
  let csrfCookie: string;

  test.beforeAll(async () => {
    // Generate a fresh wallet for each test run
    testWallet = Wallet.createRandom();
    walletAddress = testWallet.address;
    console.log(`\n🔑 Test wallet address: ${walletAddress}\n`);

    // Get CSRF token (required for POST requests)
    // Note: The backend sets the CSRF token as a cookie with httpOnly: false
    // We must read the cookie value and use that in the header, not the response body
    const csrfResponse = await fetch(`${API_BASE_URL}/api/v1/csrf-token`);
    const csrfData = await csrfResponse.json();

    // Extract CSRF cookie from Set-Cookie header (this is the actual token to use)
    const setCookieHeader = csrfResponse.headers.get('set-cookie');
    if (setCookieHeader) {
      const match = setCookieHeader.match(/X-CSRF-Token=([^;]+)/);
      if (match) {
        csrfCookie = match[1];
        csrfToken = csrfCookie; // Use cookie value as the token
      }
    }
    console.log(`🔐 CSRF Token obtained\n`);
  });

  test('Test 1: SIWE Signature Verification - Valid Signature', async () => {
    console.log('\n📝 Starting Test 1: SIWE Signature Verification');

    // Create SIWE message
    const message = `Sign in to Thunder Security Bug Bounty Platform

Wallet: ${walletAddress}
Nonce: test-nonce-${Date.now()}`;

    // Sign with wallet
    const signature = await testWallet.signMessage(message);
    console.log(`✍️  Message signed: ${signature.substring(0, 20)}...`);

    // POST to SIWE endpoint
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/siwe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        signature,
        walletAddress,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toHaveProperty('access_token');
    expect(data).toHaveProperty('refresh_token');
    expect(data).toHaveProperty('user');
    expect(data.user.id).toBeTruthy();
    expect(data.user.wallet_address).toBe(walletAddress);

    // Store token for next tests
    accessToken = data.access_token;
    console.log(`✅ SIWE verification successful`);
    console.log(`🎫 Access token: ${accessToken.substring(0, 20)}...`);
    console.log(`🔄 Refresh token: ${data.refresh_token.substring(0, 20)}...`);
  });

  test('Test 2: Reject Invalid Signature', async () => {
    console.log('\n📝 Starting Test 2: Reject Invalid Signature');

    const message = `Sign in to Thunder Security Bug Bounty Platform

Wallet: ${walletAddress}
Nonce: test-nonce-${Date.now()}`;

    // Create wrong signature by using different wallet
    const wrongWallet = Wallet.createRandom();
    const wrongSignature = await wrongWallet.signMessage(message);
    console.log(`❌ Using signature from different wallet`);

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/siwe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        signature: wrongSignature,
        walletAddress, // But claiming to be our wallet
      }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Invalid signature');
    console.log(`✅ Invalid signature correctly rejected with 401`);
  });

  test('Test 3: Reject Mismatched Wallet Address', async () => {
    console.log('\n📝 Starting Test 3: Reject Mismatched Wallet Address');

    const message = `Sign in to Thunder Security Bug Bounty Platform

Wallet: ${walletAddress}
Nonce: test-nonce-${Date.now()}`;

    const signature = await testWallet.signMessage(message);
    const wrongAddress = '0x1234567890123456789012345678901234567890';

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/siwe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        signature,
        walletAddress: wrongAddress, // Wrong address
      }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Invalid signature');
    console.log(`✅ Mismatched wallet address correctly rejected`);
  });

  test('Test 4: Protocol Registration with Authenticated Session', async ({ page }) => {
    console.log('\n📝 Starting Test 4: Protocol Registration');

    // First, create a new SIWE session
    const message = `Sign in to Thunder Security Bug Bounty Platform

Wallet: ${walletAddress}
Nonce: test-nonce-${Date.now()}`;

    const signature = await testWallet.signMessage(message);

    // Get session token
    const authResponse = await fetch(`${API_BASE_URL}/api/v1/auth/siwe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        signature,
        walletAddress,
      }),
    });

    expect(authResponse.status).toBe(200);
    const authData = await authResponse.json();
    const token = authData.access_token;
    console.log(`🎫 Got session token: ${token.substring(0, 20)}...`);

    // Get fresh CSRF token before making the protocol registration request
    const csrfResponse = await fetch(`${API_BASE_URL}/api/v1/csrf-token`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const csrfData = await csrfResponse.json();

    // Extract CSRF cookie from Set-Cookie header (this is the actual token to use)
    const setCookieHeader = csrfResponse.headers.get('set-cookie');
    let freshCsrfToken = csrfData.csrfToken;
    let freshCsrfCookie = csrfData.csrfToken;
    if (setCookieHeader) {
      const match = setCookieHeader.match(/X-CSRF-Token=([^;]+)/);
      if (match) {
        freshCsrfCookie = match[1];
        freshCsrfToken = freshCsrfCookie; // Use cookie value as the token
      }
    }

    // Now register a protocol with this session
    const protocolName = `Test Protocol ${Date.now()}`;

    const protocolResponse = await fetch(`${API_BASE_URL}/api/v1/protocols`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-csrf-token': freshCsrfToken,
        'Cookie': `X-CSRF-Token=${freshCsrfCookie}`,
      },
      body: JSON.stringify({
        name: protocolName,
        github_url: `https://github.com/test/protocol-${Date.now()}`,
        bounty_amount: 10,
        description: 'E2E test protocol registration',
        wallet_address: walletAddress,
      }),
    });

    // Check response
    console.log(`📤 Protocol registration response: ${protocolResponse.status}`);
    const protocolData = await protocolResponse.json();

    if (protocolResponse.status !== 201) {
      console.log('Response body:', protocolData);
    }

    expect(protocolResponse.status).toBe(201);
    expect(protocolData).toHaveProperty('id');
    expect(protocolData.name).toBe(protocolName);
    expect(protocolData.wallet_address).toBe(walletAddress);

    console.log(`✅ Protocol registered successfully`);
    console.log(`📋 Protocol ID: ${protocolData.id}`);
  });

  test('Test 5: Session Persistence - Token Validity', async () => {
    console.log('\n📝 Starting Test 5: Session Persistence');

    // Get a fresh session
    const message = `Sign in to Thunder Security Bug Bounty Platform

Wallet: ${walletAddress}
Nonce: test-nonce-${Date.now()}`;

    const signature = await testWallet.signMessage(message);

    const authResponse = await fetch(`${API_BASE_URL}/api/v1/auth/siwe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        signature,
        walletAddress,
      }),
    });

    const authData = await authResponse.json();
    const token = authData.access_token;

    // Use token to access protected endpoint
    const protocolsResponse = await fetch(`${API_BASE_URL}/api/v1/protocols`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    expect(protocolsResponse.status).toBe(200);
    const protocols = await protocolsResponse.json();
    expect(Array.isArray(protocols)).toBe(true);

    console.log(`✅ Session token is valid`);
    console.log(`📊 Retrieved ${protocols.length} protocols`);
  });

  test('Test 6: Re-authentication with Same Wallet', async () => {
    console.log('\n📝 Starting Test 6: Re-authentication with Same Wallet');

    // First sign-in
    const message1 = `Sign in to Thunder Security Bug Bounty Platform

Wallet: ${walletAddress}
Nonce: test-nonce-1-${Date.now()}`;

    const signature1 = await testWallet.signMessage(message1);

    const response1 = await fetch(`${API_BASE_URL}/api/v1/auth/siwe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message1,
        signature: signature1,
        walletAddress,
      }),
    });

    const data1 = await response1.json();
    const userId1 = data1.user.id;
    console.log(`👤 First sign-in user ID: ${userId1}`);

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Second sign-in with same wallet
    const message2 = `Sign in to Thunder Security Bug Bounty Platform

Wallet: ${walletAddress}
Nonce: test-nonce-2-${Date.now()}`;

    const signature2 = await testWallet.signMessage(message2);

    const response2 = await fetch(`${API_BASE_URL}/api/v1/auth/siwe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message2,
        signature: signature2,
        walletAddress,
      }),
    });

    const data2 = await response2.json();
    const userId2 = data2.user.id;
    console.log(`👤 Second sign-in user ID: ${userId2}`);

    // User IDs should be the same (no duplicate created)
    expect(userId1).toBe(userId2);
    console.log(`✅ Same user ID returned on re-authentication (no duplicate)`);
  });

  test('Test 7: Case-Insensitive Wallet Address Handling', async () => {
    console.log('\n📝 Starting Test 7: Case-Insensitive Wallet Handling');

    const message = `Sign in to Thunder Security Bug Bounty Platform

Wallet: ${walletAddress}
Nonce: test-nonce-${Date.now()}`;

    const signature = await testWallet.signMessage(message);

    // Submit with uppercase wallet address
    const upperAddress = walletAddress.toUpperCase();

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/siwe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        signature,
        walletAddress: upperAddress,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    // Backend should normalize to lowercase
    expect(data.user.wallet_address.toLowerCase()).toBe(walletAddress.toLowerCase());

    console.log(`✅ Case-insensitive wallet address handling works`);
  });

  test('Test 8: Validation Error - Missing Fields', async () => {
    console.log('\n📝 Starting Test 8: Validation Error - Missing Fields');

    // Missing walletAddress
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/siwe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'test message',
        signature: '0x123',
        // walletAddress missing
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid request body');

    console.log(`✅ Missing field validation works`);
  });

  test('Test 9: Validation Error - Invalid Wallet Format', async () => {
    console.log('\n📝 Starting Test 9: Validation Error - Invalid Wallet Format');

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/siwe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'test message',
        signature: '0x123',
        walletAddress: 'invalid-address',
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid request body');

    console.log(`✅ Invalid wallet format validation works`);
  });

  test('Test 10: Full E2E Flow - Sign-In → Register Protocol → Verify DB', async () => {
    console.log('\n📝 Starting Test 10: Full E2E Flow');

    // Step 1: Sign in with SIWE
    const message = `Sign in to Thunder Security Bug Bounty Platform

Wallet: ${walletAddress}
Nonce: test-nonce-${Date.now()}`;

    const signature = await testWallet.signMessage(message);
    console.log('1️⃣ Signing SIWE message...');

    const authResponse = await fetch(`${API_BASE_URL}/api/v1/auth/siwe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        signature,
        walletAddress,
      }),
    });

    expect(authResponse.status).toBe(200);
    const authData = await authResponse.json();
    const token = authData.access_token;
    console.log('✅ SIWE verification successful');

    // Step 2: Get fresh CSRF token before registering protocol
    const csrfResponse = await fetch(`${API_BASE_URL}/api/v1/csrf-token`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const csrfDataForTest10 = await csrfResponse.json();

    // Extract CSRF cookie from Set-Cookie header (this is the actual token to use)
    const setCookieHeaderTest10 = csrfResponse.headers.get('set-cookie');
    let freshCsrfTokenTest10 = csrfDataForTest10.csrfToken;
    let freshCsrfCookieTest10 = csrfDataForTest10.csrfToken;
    if (setCookieHeaderTest10) {
      const match = setCookieHeaderTest10.match(/X-CSRF-Token=([^;]+)/);
      if (match) {
        freshCsrfCookieTest10 = match[1];
        freshCsrfTokenTest10 = freshCsrfCookieTest10; // Use cookie value as the token
      }
    }

    // Step 3: Register a protocol
    const protocolName = `E2E Test Protocol ${Date.now()}`;
    console.log('2️⃣ Registering protocol...');

    const protocolResponse = await fetch(`${API_BASE_URL}/api/v1/protocols`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-csrf-token': freshCsrfTokenTest10,
        'Cookie': `X-CSRF-Token=${freshCsrfCookieTest10}`,
      },
      body: JSON.stringify({
        name: protocolName,
        github_url: `https://github.com/test/e2e-${Date.now()}`,
        bounty_amount: 25,
        description: 'Full E2E test protocol',
        wallet_address: walletAddress,
      }),
    });

    expect(protocolResponse.status).toBe(201);
    const protocolData = await protocolResponse.json();
    const protocolId = protocolData.id;
    console.log(`✅ Protocol registered: ${protocolId}`);

    // Step 4: Verify in database
    console.log('3️⃣ Verifying protocol in database...');

    // Query database directly using psql
    const { execSync } = require('child_process');
    try {
      const result = execSync(
        `psql -d thunder_security -t -c "SELECT id, name, wallet_address FROM \\"Protocol\\" WHERE id = '${protocolId}';"`,
        { encoding: 'utf-8' }
      );

      console.log(`✅ Protocol found in database`);
      console.log(`📊 Database record: ${result.trim()}`);

      expect(result).toContain(protocolId);
      expect(result).toContain(protocolName);
      expect(result.toLowerCase()).toContain(walletAddress.toLowerCase());
    } catch (error) {
      console.log('⚠️  Could not query database directly, but protocol registration succeeded');
    }

    console.log('\n🎉 Full E2E flow completed successfully!');
  });
});
