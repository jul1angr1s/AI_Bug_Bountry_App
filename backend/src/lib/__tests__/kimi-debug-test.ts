/**
 * Debug test to inspect raw Kimi API response structure
 *
 * Run with: npx tsx src/lib/__tests__/kimi-debug-test.ts
 */

import dotenv from 'dotenv';
dotenv.config();

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_API_URL = 'https://integrate.api.nvidia.com/v1';

async function debugKimiAPI() {
  console.log('========================================');
  console.log('Kimi API Debug Test');
  console.log('========================================\n');

  try {
    console.log('Sending request to:', `${KIMI_API_URL}/chat/completions`);
    console.log('Using API key:', KIMI_API_KEY.substring(0, 10) + '...\n');

    const response = await fetch(`${KIMI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KIMI_API_KEY}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2.5',
        messages: [
          {
            role: 'user',
            content: 'Say hello and explain what you are in one sentence.',
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
        top_p: 1.0,
        stream: false,
        chat_template_kwargs: {
          thinking: true,
        },
      }),
    });

    console.log('Response status:', response.status, response.statusText, '\n');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      process.exit(1);
    }

    const data = await response.json();

    console.log('========================================');
    console.log('Full API Response:');
    console.log('========================================');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n========================================');

    if (data.choices && data.choices[0]) {
      const message = data.choices[0].message;
      console.log('\nMessage Fields Available:');
      console.log('  - role:', message.role);
      console.log('  - content:', message.content ? `"${message.content}"` : null);
      console.log('  - thinking:', message.thinking ? 'Present' : 'Not present');

      if (message.thinking) {
        console.log('\nThinking Content:');
        console.log('─────────────────────────────────────');
        console.log(message.thinking);
        console.log('─────────────────────────────────────');
      }

      if (message.content) {
        console.log('\nMain Content:');
        console.log('─────────────────────────────────────');
        console.log(message.content);
        console.log('─────────────────────────────────────');
      }
    }

    if (data.usage) {
      console.log('\nToken Usage:');
      console.log('  Prompt tokens:', data.usage.prompt_tokens);
      console.log('  Completion tokens:', data.usage.completion_tokens);
      console.log('  Total tokens:', data.usage.total_tokens);
    }

    console.log('\n========================================');
    console.log('✓ Debug test complete!');
    console.log('========================================');
  } catch (error) {
    console.error('\nError:', error);
    process.exit(1);
  }
}

debugKimiAPI();
