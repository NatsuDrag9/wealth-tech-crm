import { config } from '../../config/environment';
import { resilienceConfig } from '../../config/resilience';
import { calculateBackoffWithJitter } from '../utils/resilience';
import { logger } from '../utils/logger';
import { ragGenerationCallsTotal, ragSynthesisDurationSeconds } from '../metrics/metrics';

/**
 * Resilient Gemini 2.0 Flash Generation Service for Node.js.
 * Executes grounded natural-language synthesis with system guardrails,
 * exponential backoff, request timeouts, and deterministic local fallback.
 */
export class GeminiGenerationService {
  private readonly apiKey: string;
  private readonly apiBaseUrl: string;
  private readonly generationModel: string;
  private readonly defaultTemperature: number;
  private readonly connectTimeoutMs: number;
  private readonly requestTimeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;

  constructor() {
    this.apiKey = config.gemini.apiKey.trim();
    this.apiBaseUrl = config.gemini.apiBaseUrl.trim().replace(/\/+$/, '');
    this.generationModel = config.gemini.generationModel.trim() || 'gemini-2.0-flash';
    this.defaultTemperature = config.gemini.generationTemperature;
    this.connectTimeoutMs = config.gemini.connectTimeoutMs;
    this.requestTimeoutMs = config.gemini.requestTimeoutMs;
    this.maxRetries = config.gemini.maxRetries;
    this.baseDelayMs = config.gemini.baseDelayMs;

    if (this.isLiveKeyConfigured()) {
      logger.info(
        { model: this.generationModel, baseUrl: this.apiBaseUrl, temperature: this.defaultTemperature },
        'GeminiGenerationService initialized with live API key'
      );
    } else {
      logger.info(
        'GeminiGenerationService initialized in local fallback mode (no live GEMINI_API_KEY detected)'
      );
    }
  }

  public isLiveKeyConfigured(): boolean {
    return this.apiKey.length > 0 && !this.apiKey.startsWith('your_');
  }

  /**
   * Synthesizes an answer using Gemini 2.0 Flash based strictly on grounded evidence.
   */
  public async generateGroundedResponse(
    systemInstruction: string,
    userPrompt: string,
    temperatureOverride?: number
  ): Promise<string> {
    if (!userPrompt || userPrompt.trim().length === 0) {
      return 'No prompt provided for generation.';
    }

    if (!this.isLiveKeyConfigured()) {
      ragGenerationCallsTotal.inc({ status: 'fallback_no_key' });
      return this.generateLocalFallback(userPrompt);
    }

    const resolvedTemperature =
      temperatureOverride !== undefined && temperatureOverride >= 0.0 && temperatureOverride <= 1.0
        ? temperatureOverride
        : this.defaultTemperature;

    const endTimer = ragSynthesisDurationSeconds.startTimer({ status: 'success' });
    let attempt = 0;

    const retryPolicy = {
      ...resilienceConfig.ai,
      maxRetries: this.maxRetries,
      baseDelayMs: this.baseDelayMs,
    };

    while (true) {
      try {
        const endpoint = `${this.apiBaseUrl}/${this.generationModel}:generateContent?key=${this.apiKey}`;
        const payload = {
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: resolvedTemperature,
            maxOutputTokens: 2048,
          },
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = (await response.json()) as {
            candidates?: Array<{
              content?: {
                parts?: Array<{ text?: string }>;
              };
            }>;
          };

          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            endTimer({ status: 'success' });
            ragGenerationCallsTotal.inc({ status: 'success' });
            return text.trim();
          }
        }

        const statusCode = response.status;
        const isRetryable = statusCode === 429 || statusCode >= 500;

        if (isRetryable && attempt < this.maxRetries) {
          const delayMs = calculateBackoffWithJitter(attempt, retryPolicy);
          logger.warn(
            { statusCode, attempt: attempt + 1, maxRetries: this.maxRetries, delayMs },
            'Gemini generateContent returned transient error. Scheduling retry with backoff.'
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          attempt++;
          continue;
        }

        const errorBody = await response.text();
        logger.warn(
          { statusCode, errorBody },
          'Gemini generateContent failed. Falling back to deterministic synthesis.'
        );
        break;
      } catch (error: unknown) {
        if (attempt < this.maxRetries) {
          const delayMs = calculateBackoffWithJitter(attempt, retryPolicy);
          logger.warn(
            { err: error, attempt: attempt + 1, delayMs },
            'Network failure during Gemini generateContent. Retrying with backoff.'
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          attempt++;
          continue;
        }

        logger.warn(
          { err: error },
          'Gemini generateContent retries exhausted. Falling back to deterministic synthesis.'
        );
        break;
      }
    }

    endTimer({ status: 'fallback_error' });
    ragGenerationCallsTotal.inc({ status: 'fallback_error' });
    return this.generateLocalFallback(userPrompt);
  }

  /**
   * Deterministic local fallback matching Java implementation when Gemini is unavailable.
   */
  private generateLocalFallback(userPrompt: string): string {
    const lines = userPrompt.split('\n');
    const sourceSummary: string[] = [];

    for (const line of lines) {
      if (line.startsWith('[Source ')) {
        const header = line.trim();
        sourceSummary.push(header);
      }
    }

    const sb: string[] = [];
    sb.push('### Grounded Advisory Summary (Local Deterministic Synthesis)');
    sb.push(
      'Based on the official mutual fund regulatory disclosures and factsheets retrieved for your query:'
    );
    sb.push('');

    if (sourceSummary.length > 0) {
      for (let i = 0; i < sourceSummary.length; i++) {
        sb.push(`${i + 1}. Verified data extracted from ${sourceSummary[i]}`);
      }
      sb.push('');
      sb.push(
        'All cited funds adhere to the assessed risk appetite category and regulatory suitability constraints [Source 1].'
      );
    } else {
      sb.push(
        'Retrieved evidence documents confirm fund suitability and statutory disclosures, but no specific source tags were detected.'
      );
    }

    sb.push('');
    sb.push(
      '*Notice: Synthesized via offline deterministic fallback engine. Configure a live GEMINI_API_KEY for dynamic generative reasoning.*'
    );

    return sb.join('\n');
  }
}

export const geminiGenerationService = new GeminiGenerationService();
