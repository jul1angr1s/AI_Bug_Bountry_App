import { test, expect } from '@playwright/test';
import { Wallet } from 'ethers';

const API_BASE_URL = 'http://localhost:3000';

test.describe('Protocol Registration CSRF Tests', () => {
  let testWallet: Wallet;
  let walletAddress: string;
  let accessToken: string;

  test.beforeAll(async () => {
    // Generate a fresh wallet for each test run
    testWallet = Wallet.createRandom();
    walletAddress = testWallet.address;
    console.log(`\n🔑 Test wallet address: ${walletAddress}\n`);
  });

  test('should successfully register protocol with CSRF token', async ({ request, context }) => {
    console.log('\n📝 Starting test: Protocol registration with CSRF token');

    // Step 1: Fetch CSRF token (this will set the cookie)
    console.log('📝 Fetching CSRF token...');
    const csrfResponse = await request.get(`${API_BASE_URL}/api/v1/csrf-token`);

    expect(csrfResponse.ok()).toBeTruthy();
    const csrfData = await csrfResponse.json();
    const csrfTokenFromResponse = csrfData.csrfToken;

    // Get CSRF cookie from response
    const setCookieHeader = csrfResponse.headers()['set-cookie'];
    let csrfCookieValue = null;
    if (setCookieHeader) {
      const match = Array.isArray(setCookieHeader)
        ? setCookieHeader[0]?.match(/X-CSRF-Token=([^;]+)/)
        : (setCookieHeader as string)?.match(/X-CSRF-Token=([^;]+)/);
      if (match) {
        csrfCookieValue = match[1];
      }
    }

    console.log(`📊 CSRF Token from response body: ${csrfTokenFromResponse?.substring(0, 10)}...`);
    console.log(`📊 CSRF Cookie value: ${csrfCookieValue?.substring(0, 10) || 'NOT FOUND'}...`);
    console.log(
      `📊 Token and cookie match: ${csrfTokenFromResponse === csrfCookieValue ? '✅' : '❌'}`
    );

    // Step 2: Authenticate with SIWE
    console.log('\n📝 Authenticating with SIWE...');
    const message = `Sign in to Thunder Security Bug Bounty Platform

Wallet: ${walletAddress}
Nonce: test-nonce-${Date.now()}`;

    const signature = await testWallet.signMessage(message);

    const authResponse = await request.post(`${API_BASE_URL}/api/v1/auth/siwe`, {
      data: {
        message,
        signature,
        walletAddress,
      },
    });

    expect(authResponse.ok()).toBeTruthy();
    const authData = await authResponse.json();
    accessToken = authData.access_token;
    console.log(`✅ Authentication successful, token: ${accessToken.substring(0, 20)}...`);

    // Step 3: Get fresh CSRF token after auth
    console.log('\n📝 Fetching fresh CSRF token after auth...');
    const csrfResponse2 = await request.get(`${API_BASE_URL}/api/v1/csrf-token`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    expect(csrfResponse2.ok()).toBeTruthy();
    const csrfData2 = await csrfResponse2.json();
    const csrfTokenForRequest = csrfData2.csrfToken;

    // Get updated CSRF cookie
    const setCookieHeader2 = csrfResponse2.headers()['set-cookie'];
    let csrfCookieValue2 = null;
    if (setCookieHeader2) {
      const match = Array.isArray(setCookieHeader2)
        ? setCookieHeader2[0]?.match(/X-CSRF-Token=([^;]+)/)
        : (setCookieHeader2 as string)?.match(/X-CSRF-Token=([^;]+)/);
      if (match) {
        csrfCookieValue2 = match[1];
      }
    }

    console.log(`📊 Fresh CSRF Token: ${csrfTokenForRequest?.substring(0, 10)}...`);
    console.log(`📊 Fresh CSRF Cookie: ${csrfCookieValue2?.substring(0, 10) || 'NOT FOUND'}...`);
    console.log(
      `📊 Token and cookie match: ${csrfTokenForRequest === csrfCookieValue2 ? '✅' : '❌'}`
    );

    // Step 4: Register protocol with CSRF token
    console.log('\n📝 Registering protocol with CSRF protection...');
    const protocolData = {
      name: `Test Protocol ${Date.now()}`,
      github_url: `https://github.com/test/test-protocol-${Date.now()}`,
      bounty_amount: 10,
      description: 'E2E test protocol registration with CSRF',
      wallet_address: walletAddress,
    };

    // Use fresh token and the correct cookie value
    const registrationResponse = await request.post(`${API_BASE_URL}/api/v1/protocols`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-csrf-token': csrfTokenForRequest,
        'Content-Type': 'application/json',
        'Cookie': `X-CSRF-Token=${csrfCookieValue2}`,
      },
      data: protocolData,
    });

    // Log response for debugging
    console.log(`📤 Registration response status: ${registrationResponse.status()}`);
    if (!registrationResponse.ok()) {
      const errorBody = await registrationResponse.json();
      console.log(`❌ Error response: ${JSON.stringify(errorBody)}`);
    } else {
      const responseBody = await registrationResponse.json();
      console.log(`✅ Protocol registered successfully, ID: ${responseBody.id}`);
    }

    // This should PASS after the fix
    expect(registrationResponse.ok()).toBeTruthy();
    console.log('✅ Protocol registration with CSRF token succeeded');
  });

  test('should fail protocol registration without CSRF token', async ({ request }) => {
    console.log('\n📝 Starting test: Reject protocol registration without CSRF token');

    // Step 1: Authenticate
    const testWallet2 = Wallet.createRandom();
    const walletAddress2 = testWallet2.address;

    const message = `Sign in to Thunder Security Bug Bounty Platform

Wallet: ${walletAddress2}
Nonce: test-nonce-${Date.now()}`;

    const signature = await testWallet2.signMessage(message);

    const authResponse = await request.post(`${API_BASE_URL}/api/v1/auth/siwe`, {
      data: { message, signature, walletAddress: walletAddress2 },
    });

    expect(authResponse.ok()).toBeTruthy();
    const { access_token } = await authResponse.json();

    // Step 2: Try to register WITHOUT CSRF token
    const protocolData = {
      name: `Test Protocol ${Date.now()}`,
      github_url: `https://github.com/test/test-protocol-${Date.now()}`,
      bounty_amount: 10,
      description: 'E2E test protocol registration',
      wallet_address: walletAddress2,
    };

    const registrationResponse = await request.post(`${API_BASE_URL}/api/v1/protocols`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        // No x-csrf-token header
        'Content-Type': 'application/json',
      },
      data: protocolData,
    });

    // Should fail with 403
    console.log(`📤 Response status: ${registrationResponse.status()}`);
    expect(registrationResponse.status()).toBe(403);
    const errorBody = await registrationResponse.json();
    expect(errorBody.error.code).toBe('CSRF_MISSING');
    console.log('✅ Correctly rejected request without CSRF token');
  });

  test('should fail protocol registration with invalid CSRF token', async ({ request }) => {
    console.log('\n📝 Starting test: Reject protocol registration with invalid CSRF token');

    // Step 1: Authenticate
    const testWallet3 = Wallet.createRandom();
    const walletAddress3 = testWallet3.address;

    const message = `Sign in to Thunder Security Bug Bounty Platform

Wallet: ${walletAddress3}
Nonce: test-nonce-${Date.now()}`;

    const signature = await testWallet3.signMessage(message);

    const authResponse = await request.post(`${API_BASE_URL}/api/v1/auth/siwe`, {
      data: { message, signature, walletAddress: walletAddress3 },
    });

    expect(authResponse.ok()).toBeTruthy();
    const { access_token } = await authResponse.json();

    // Step 2: Try to register with INVALID CSRF token
    const protocolData = {
      name: `Test Protocol ${Date.now()}`,
      github_url: `https://github.com/test/test-protocol-${Date.now()}`,
      bounty_amount: 10,
      description: 'E2E test protocol registration',
      wallet_address: walletAddress3,
    };

    const registrationResponse = await request.post(`${API_BASE_URL}/api/v1/protocols`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'x-csrf-token': 'invalid-token-12345', // Wrong token
        'Content-Type': 'application/json',
      },
      data: protocolData,
    });

    // Should fail with 403
    console.log(`📤 Response status: ${registrationResponse.status()}`);
    expect(registrationResponse.status()).toBe(403);
    const errorBody = await registrationResponse.json();
    expect(errorBody.error.code).toBe('CSRF_MISMATCH');
    console.log('✅ Correctly rejected request with invalid CSRF token');
  });
});
