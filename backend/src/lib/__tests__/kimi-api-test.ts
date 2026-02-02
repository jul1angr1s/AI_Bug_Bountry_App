/**
 * Test script for Kimi 2.5 API integration via NVIDIA
 *
 * Run with: npx tsx src/lib/__tests__/kimi-api-test.ts
 */

import dotenv from 'dotenv';
import { getKimiClient } from '../llm.js';

// Load environment variables from .env file
dotenv.config();

async function testKimiAPI() {
  console.log('========================================');
  console.log('Testing Kimi 2.5 API Integration');
  console.log('========================================\n');

  try {
    // Initialize client
    console.log('[1/3] Initializing Kimi LLM client...');
    const kimiClient = getKimiClient();
    console.log('✓ Client initialized\n');

    // Health check
    console.log('[2/3] Running health check...');
    const isHealthy = await kimiClient.healthCheck();

    if (!isHealthy) {
      console.error('✗ Health check failed!');
      console.error('  - Check API key is correct');
      console.error('  - Check network connectivity');
      console.error('  - Check API endpoint is accessible\n');
      process.exit(1);
    }

    console.log('✓ Health check passed\n');

    // Test chat completion with thinking mode
    console.log('[3/3] Testing chat completion with thinking mode...');
    const response = await kimiClient.chat(
      [
        {
          role: 'user',
          content:
            'Explain in 2-3 sentences what a reentrancy vulnerability is in Solidity smart contracts.',
        },
      ],
      0.7, // Temperature
      500, // Max tokens
      true // Enable thinking mode
    );

    console.log('✓ Chat completion successful\n');
    console.log('Response:');
    console.log('─────────────────────────────────────');
    console.log(response.content || '(No content returned - check API response format)');
    console.log('─────────────────────────────────────\n');
    console.log(`Response length: ${response.content.length} characters`);

    if (response.usage) {
      console.log('Usage Statistics:');
      console.log(`  Prompt tokens:     ${response.usage.promptTokens}`);
      console.log(`  Completion tokens: ${response.usage.completionTokens}`);
      console.log(`  Total tokens:      ${response.usage.totalTokens}\n`);
    }

    console.log('========================================');
    console.log('✓ All tests passed!');
    console.log('========================================');
  } catch (error) {
    console.error('\n========================================');
    console.error('✗ Test failed with error:');
    console.error('========================================');

    if (error instanceof Error) {
      console.error(`\nError: ${error.message}\n`);

      if (error.message.includes('API error')) {
        console.error('Troubleshooting:');
        console.error('  1. Verify KIMI_API_KEY is set correctly in .env');
        console.error('  2. Check API key format (should start with "nvapi-")');
        console.error('  3. Verify API endpoint is accessible');
        console.error('  4. Check rate limits or quota\n');
      } else if (error.message.includes('required')) {
        console.error('Action needed:');
        console.error('  - Set KIMI_API_KEY in backend/.env file\n');
      }
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

// Run test
testKimiAPI();
