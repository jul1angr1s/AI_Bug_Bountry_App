/**
 * LLM Client for Kimi 2.5 (Moonshot AI via NVIDIA)
 *
 * Kimi 2.5 is provided by Moonshot AI and is accessed via NVIDIA's API Gateway.
 * API Endpoint: https://integrate.api.nvidia.com/v1
 * Model: moonshotai/kimi-k2.5
 *
 * This model supports extended thinking via chat_template_kwargs.
 * For proof validation, we use max_tokens: 16384 for detailed analysis.
 */

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class KimiLLMClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    // Get API key from environment (NVIDIA API key format: nvapi-...)
    this.apiKey = process.env.KIMI_API_KEY || '';

    if (!this.apiKey) {
      throw new Error(
        'KIMI_API_KEY environment variable is required (NVIDIA API key)'
      );
    }

    // NVIDIA API Gateway endpoint for Kimi 2.5
    this.baseUrl = process.env.KIMI_API_URL || 'https://integrate.api.nvidia.com/v1';

    // Model: moonshotai/kimi-k2.5 via NVIDIA
    this.model = process.env.KIMI_MODEL || 'moonshotai/kimi-k2.5';

    console.log(`[KimiLLM] Initialized with model: ${this.model}`);
  }

  /**
   * Send chat completion request to Kimi 2.5 via NVIDIA API
   */
  async chat(
    messages: LLMMessage[],
    temperature: number = 0.3,
    maxTokens: number = 16384,
    enableThinking: boolean = true
  ): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json', // Use 'text/event-stream' for streaming
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature,
          max_tokens: maxTokens,
          top_p: 1.0,
          stream: false, // Set to true for streaming support
          chat_template_kwargs: {
            thinking: enableThinking, // Enable extended thinking for Kimi 2.5
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Kimi API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();

      // Extract response
      // Kimi 2.5 with thinking mode returns reasoning in 'reasoning_content' or 'reasoning' field
      // and the final answer in 'content' field (may be null if all tokens used for thinking)
      const message = data.choices?.[0]?.message;
      const content = message?.content || '';
      const reasoning = message?.reasoning_content || message?.reasoning || '';

      // If thinking mode is enabled and we got reasoning but no content,
      // use the reasoning as the response
      // Otherwise, combine reasoning and content if both present
      let fullContent = '';
      if (reasoning && !content) {
        fullContent = reasoning;
      } else if (reasoning && content) {
        fullContent = `${reasoning}\n\n---\n\n${content}`;
      } else {
        fullContent = content;
      }

      const usage = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined;

      return {
        content: fullContent,
        usage,
      };
    } catch (error) {
      console.error('[KimiLLM] Chat completion failed:', error);
      throw error;
    }
  }

  /**
   * Analyze Solidity exploit proof with structured prompt
   */
  async analyzeProof(
    vulnerabilityType: string,
    proofCode: string,
    contractCode: string,
    description: string
  ): Promise<{
    isValid: boolean;
    confidence: number;
    reasoning: string;
    severity?: string;
    exploitability?: string;
  }> {
    const systemPrompt = `You are an expert Solidity security auditor validating vulnerability reports from automated scanning tools (Slither, AI analysis).

Your role is to determine if reported vulnerabilities are REAL and EXPLOITABLE based on:
1. The vulnerability type and its known attack patterns
2. The description from the scanning tool
3. The reproduction steps provided
4. Available contract code (if any)

IMPORTANT VALIDATION RULES:
- ORACLE_MANIPULATION: If a protocol uses a DEX (like TSwap, Uniswap) for price feeds, this is a VALID HIGH/CRITICAL vulnerability. Flash loan + swap attacks are well-documented.
- REENTRANCY: If external calls happen before state updates, this is VALID. Check for CEI pattern violations.
- ACCESS_CONTROL: Missing modifiers on sensitive functions are VALID vulnerabilities.
- INTEGER_OVERFLOW: In Solidity <0.8.0 without SafeMath, these are VALID. In >=0.8.0, check for unchecked blocks.
- BUSINESS_LOGIC: Validate based on the specific description - if the logic flaw is clearly explained, it's likely VALID.

You are validating AUTOMATED SCAN RESULTS, not manually written exploit code. Be generous with validation if:
- The vulnerability type matches known attack patterns
- The description clearly explains the issue
- The location is specified in the code

Reject only if:
- The vulnerability type is clearly misidentified
- The description doesn't match the vulnerability type
- It's obviously a false positive (e.g., in test files, mock contracts)`;

    const userPrompt = `Validate this vulnerability report from an automated security scan.

**Vulnerability Type:** ${vulnerabilityType}

**Tool Description:** ${description}

**Reproduction Steps:**
${proofCode}

**Contract Code Context:**
${contractCode.slice(0, 4000)}
${contractCode.length > 4000 ? '\n... (truncated)' : ''}

**Validation Checklist:**
1. Is ${vulnerabilityType} a real vulnerability class? (Yes for all common types)
2. Does the description match the vulnerability type?
3. Are the reproduction steps plausible for this vulnerability?
4. Would this be exploitable in a real deployment?

**Known High-Risk Patterns to VALIDATE:**
- DEX price oracles (TSwap, Uniswap spot prices) = ORACLE_MANIPULATION = VALID
- External calls before state updates = REENTRANCY = VALID
- Missing access control on withdraw/admin functions = ACCESS_CONTROL = VALID
- Flash loan attack vectors = VALID for DeFi protocols
- Fee calculations using spot prices = ORACLE_MANIPULATION = VALID

**Response Format (JSON only):**
{
  "isValid": true,
  "confidence": 85,
  "reasoning": "Brief technical explanation of why this is valid/invalid",
  "severity": "CRITICAL/HIGH/MEDIUM/LOW",
  "exploitability": "Easy/Moderate/Hard"
}

Respond with ONLY valid JSON, no markdown or extra text.`;

    try {
      const response = await this.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        0.3, // Low temperature for consistent validation
        16384, // Max tokens for detailed analysis
        true // Enable thinking mode for deep reasoning
      );

      // Parse JSON response
      const content = response.content.trim();

      // Extract JSON from markdown code blocks if present
      let jsonStr = content;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // Try to extract JSON object
        const objMatch = content.match(/\{[\s\S]*\}/);
        if (objMatch) {
          jsonStr = objMatch[0];
        }
      }

      const result = JSON.parse(jsonStr);

      console.log('[KimiLLM] Proof analysis complete:', {
        isValid: result.isValid,
        confidence: result.confidence,
      });

      return {
        isValid: result.isValid ?? false,
        confidence: result.confidence ?? 0,
        reasoning: result.reasoning || 'No reasoning provided',
        severity: result.severity,
        exploitability: result.exploitability,
      };
    } catch (error) {
      console.error('[KimiLLM] Failed to analyze proof:', error);

      // Fallback response on parse error
      return {
        isValid: false,
        confidence: 0,
        reasoning: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check if LLM client is configured correctly
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.chat(
        [{ role: 'user', content: 'Hello, respond with OK' }],
        0, // Temperature
        100, // Max tokens (small for health check)
        false // Disable thinking for simple health check
      );
      return response.content.toLowerCase().includes('ok');
    } catch (error) {
      console.error('[KimiLLM] Health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
let kimiClient: KimiLLMClient | null = null;

export function getKimiClient(): KimiLLMClient {
  if (!kimiClient) {
    kimiClient = new KimiLLMClient();
  }
  return kimiClient;
}
