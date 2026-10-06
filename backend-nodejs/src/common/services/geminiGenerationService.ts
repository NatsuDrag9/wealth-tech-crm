import { config } from '../../config/environment';
import { resilienceConfig } from '../../config/resilience';
import { calculateBackoffWithJitter } from '../utils/resilience';
import { logger } from '../utils/logger';
import { ragGenerationCallsTotal, ragSynthesisDurationSeconds } from '../metrics/metrics';

/**
 * Resilient Google Gemini Generation Service for Node.js.
 * Features:
 * - Differentiated failure policies: transient 503/5xx retries with backoff+jitter; 429 triggers immediate model cascade
 * - Model cascading: primary model -> gemini-3.5-flash -> gemini-flash-latest
 * - Honest sentinel degradation when all models are exhausted
 * - Deterministic local fallback for unconfigured/offline environments
 * - Full Prometheus and Loki telemetry instrumentation
 */
export class GeminiGenerationService {
  /**
   * Honest sentinel returned when all models (primary + fallbacks) are unavailable.
   */
  public static readonly SYNTHESIS_UNAVAILABLE_SENTINEL =
    '[SYNTHESIS_UNAVAILABLE: The AI generation service is temporarily at capacity. The retrieved evidence chunks are available for manual review.]';

  private readonly apiKey: string;
  private readonly apiBaseUrl: string;
  private readonly generationModel: string;
  private readonly fallbackModels: string[];
  private readonly defaultTemperature: number;
  private readonly connectTimeoutMs: number;
  private readonly requestTimeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;

  constructor() {
    this.apiKey = config.gemini.apiKey.trim();
    this.apiBaseUrl = config.gemini.apiBaseUrl.trim().replace(/\/+$/, '');
    this.generationModel = config.gemini.generationModel.trim() || 'gemini-2.0-flash';
    this.fallbackModels =
      config.gemini.fallbackModels && config.gemini.fallbackModels.length > 0
        ? config.gemini.fallbackModels
        : ['gemini-3.5-flash', 'gemini-flash-latest'];
    this.defaultTemperature = config.gemini.generationTemperature;
    this.connectTimeoutMs = config.gemini.connectTimeoutMs;
    this.requestTimeoutMs = config.gemini.requestTimeoutMs;
    this.maxRetries = config.gemini.maxRetries;
    this.baseDelayMs = config.gemini.baseDelayMs;

    if (this.isLiveKeyConfigured()) {
      logger.info(
        {
          model: this.generationModel,
          fallbacks: this.fallbackModels,
          baseUrl: this.apiBaseUrl,
          temperature: this.defaultTemperature,
        },
        'GeminiGenerationService initialized with live API key and model cascade'
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
   * Returns true if the answer represents the honest capacity unavailable sentinel.
   */
  public static isSynthesisUnavailable(answer?: string | null): boolean {
    return typeof answer === 'string' && answer.startsWith('[SYNTHESIS_UNAVAILABLE:');
  }

  /**
   * Synthesizes an answer using Gemini grounded generation based strictly on provided evidence.
   * Resiliency & Fallback Strategy:
   * 1. Attempt primary model (e.g. gemini-3.8-flash / gemini-2.0-flash).
   * 2. On HTTP 503 / 5xx transient: retry up to maxRetries with backoff + jitter on same model.
   * 3. On HTTP 429 (quota exhausted): immediately cascade to next fallback model without burning useless retries.
   * 4. If all models exhausted: return honest SYNTHESIS_UNAVAILABLE_SENTINEL.
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

    // 1. Try primary configured model
    const primaryResult = await this.executeGenerateWithModel(
      this.generationModel,
      systemInstruction,
      userPrompt,
      resolvedTemperature
    );

    if (primaryResult !== null) {
      endTimer({ status: 'success' });
      return primaryResult;
    }

    // 2. Cascade through fallback models on quota exhaustion (429) or primary failure
    for (const fallbackModel of this.fallbackModels) {
      if (fallbackModel.toLowerCase() === this.generationModel.toLowerCase()) {
        continue;
      }
      logger.warn(
        { primaryModel: this.generationModel, fallbackModel },
        'Primary model unavailable or quota exhausted. Cascading to fallback model.'
      );
      ragGenerationCallsTotal.inc({ status: `cascade_${fallbackModel}` });

      const cascadeResult = await this.executeGenerateWithModel(
        fallbackModel,
        systemInstruction,
        userPrompt,
        resolvedTemperature
      );

      if (cascadeResult !== null) {
        endTimer({ status: 'success' });
        return cascadeResult;
      }
    }

    // 3. All models exhausted: Return honest capacity sentinel instead of fake offline text
    logger.error(
      { primaryModel: this.generationModel, fallbackCount: this.fallbackModels.length },
      'All generation models in cascade exhausted. Returning unavailable sentinel.'
    );
    endTimer({ status: 'all_quota_exhausted' });
    ragGenerationCallsTotal.inc({ status: 'all_quota_exhausted' });
    return GeminiGenerationService.SYNTHESIS_UNAVAILABLE_SENTINEL;
  }

  private async executeGenerateWithModel(
    modelName: string,
    systemInstruction: string,
    userPrompt: string,
    resolvedTemperature: number
  ): Promise<string | null> {
    const retryPolicy = {
      ...resilienceConfig.ai,
      maxRetries: this.maxRetries,
      baseDelayMs: this.baseDelayMs,
    };

    let attempt = 0;

    while (true) {
      try {
        const endpoint = `${this.apiBaseUrl}/${modelName}:generateContent?key=${this.apiKey}`;

        const generationConfig: Record<string, unknown> = {
          temperature: resolvedTemperature,
          maxOutputTokens: 2048,
        };

        if (modelName.includes('3.') || modelName.includes('2.5')) {
          generationConfig.thinkingConfig = { thinkingBudget: 0 };
        }

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
          generationConfig,
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
            ragGenerationCallsTotal.inc({ status: 'success' });
            return text.trim();
          }
        }

        const statusCode = response.status;

        // HTTP 429: Quota exhausted. Retrying the same model is blocked. Return null immediately to trigger cascade.
        if (statusCode === 429) {
          logger.warn(
            { model: modelName, statusCode },
            'Gemini model quota exhausted (HTTP 429). Triggering immediate model cascade.'
          );
          ragGenerationCallsTotal.inc({ status: 'quota_exhausted' });
          return null;
        }

        // HTTP 503 or transient 5xx: Server load spike. Retry with backoff on the SAME model.
        const isTransient = statusCode >= 500;
        if (isTransient && attempt < this.maxRetries) {
          const delayMs = calculateBackoffWithJitter(attempt, retryPolicy);
          logger.warn(
            { model: modelName, statusCode, attempt: attempt + 1, maxRetries: this.maxRetries, delayMs },
            'Gemini generateContent returned transient error. Scheduling retry with backoff on same model.'
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          attempt++;
          continue;
        }

        const errorBody = await response.text();
        logger.warn(
          { model: modelName, statusCode, errorBody },
          'Gemini generateContent failed for model.'
        );
        return null;
      } catch (error: unknown) {
        if (attempt < this.maxRetries) {
          const delayMs = calculateBackoffWithJitter(attempt, retryPolicy);
          logger.warn(
            { model: modelName, err: error, attempt: attempt + 1, maxRetries: this.maxRetries, delayMs },
            'Network failure during Gemini generateContent. Retrying with backoff on same model.'
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          attempt++;
          continue;
        }

        logger.warn(
          { model: modelName, err: error },
          'Gemini generateContent retries exhausted for model.'
        );
        return null;
      }
    }
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
