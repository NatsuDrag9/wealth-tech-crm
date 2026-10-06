import crypto from 'crypto';
import { config } from '../../config/environment';
import { resilienceConfig } from '../../config/resilience';
import { calculateBackoffWithJitter } from '../utils/resilience';
import { logger } from '../utils/logger';
import { ragEmbeddingCallsTotal, ragEmbeddingDurationSeconds } from '../metrics/metrics';

export const EMBEDDING_DIMENSION = 768;

/**
 * Resilient Gemini Embedding Service for Node.js.
 * Produces 768-dimensional vector embeddings with exponential backoff,
 * request timeouts, and deterministic local fallback when offline.
 */
export class GeminiEmbeddingService {
  private readonly apiKey: string;
  private readonly apiBaseUrl: string;
  private readonly embeddingModel: string;
  private readonly connectTimeoutMs: number;
  private readonly requestTimeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;

  constructor() {
    this.apiKey = config.gemini.apiKey.trim();
    this.apiBaseUrl = config.gemini.apiBaseUrl.trim().replace(/\/+$/, '');
    this.embeddingModel = config.gemini.embeddingModel.trim() || 'text-embedding-004';
    this.connectTimeoutMs = config.gemini.connectTimeoutMs;
    this.requestTimeoutMs = config.gemini.requestTimeoutMs;
    this.maxRetries = config.gemini.maxRetries;
    this.baseDelayMs = config.gemini.baseDelayMs;

    if (this.isLiveKeyConfigured()) {
      logger.info(
        { model: this.embeddingModel, baseUrl: this.apiBaseUrl },
        'GeminiEmbeddingService initialized with live API key'
      );
    } else {
      logger.info(
        'GeminiEmbeddingService initialized in deterministic local fallback mode (no live GEMINI_API_KEY detected)'
      );
    }
  }

  public isLiveKeyConfigured(): boolean {
    return this.apiKey.length > 0 && !this.apiKey.startsWith('your_');
  }

  /**
   * Generates a 768-dimensional normalized embedding vector for the input text.
   */
  public async getEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      return new Array<number>(EMBEDDING_DIMENSION).fill(0);
    }

    if (!this.isLiveKeyConfigured()) {
      ragEmbeddingCallsTotal.inc({ status: 'fallback_no_key' });
      return this.generateDeterministicEmbedding(text);
    }

    const endTimer = ragEmbeddingDurationSeconds.startTimer({ status: 'success' });
    let attempt = 0;

    const retryPolicy = {
      ...resilienceConfig.ai,
      maxRetries: this.maxRetries,
      baseDelayMs: this.baseDelayMs,
    };

    while (true) {
      try {
        const endpoint = `${this.apiBaseUrl}/${this.embeddingModel}:embedContent?key=${this.apiKey}`;
        const payload = {
          model: `models/${this.embeddingModel}`,
          content: {
            parts: [{ text }],
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
          const data = (await response.json()) as { embedding?: { values?: number[] } };
          const values = data.embedding?.values;

          if (Array.isArray(values) && values.length > 0) {
            endTimer({ status: 'success' });
            ragEmbeddingCallsTotal.inc({ status: 'success' });
            return values;
          }
        }

        const statusCode = response.status;
        const isRetryable = statusCode === 429 || statusCode >= 500;

        if (isRetryable && attempt < this.maxRetries) {
          const delayMs = calculateBackoffWithJitter(attempt, retryPolicy);
          logger.warn(
            { statusCode, attempt: attempt + 1, maxRetries: this.maxRetries, delayMs },
            'Gemini embedContent returned transient error. Scheduling retry with backoff.'
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          attempt++;
          continue;
        }

        const errorBody = await response.text();
        logger.warn(
          { statusCode, errorBody },
          'Gemini embedContent failed. Falling back to deterministic embedding.'
        );
        break;
      } catch (error: unknown) {
        if (attempt < this.maxRetries) {
          const delayMs = calculateBackoffWithJitter(attempt, retryPolicy);
          logger.warn(
            { err: error, attempt: attempt + 1, delayMs },
            'Network failure during Gemini embedContent. Retrying with backoff.'
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          attempt++;
          continue;
        }

        logger.warn(
          { err: error },
          'Gemini embedContent retries exhausted. Falling back to deterministic embedding.'
        );
        break;
      }
    }

    endTimer({ status: 'fallback_error' });
    ragEmbeddingCallsTotal.inc({ status: 'fallback_error' });
    return this.generateDeterministicEmbedding(text);
  }

  /**
   * Deterministic SHA-256 PRNG fallback that generates consistent unit-length vectors.
   */
  private generateDeterministicEmbedding(text: string): number[] {
    const hash = crypto.createHash('sha256').update(text).digest();
    let seed = hash.readUInt32BE(0);

    const vector: number[] = new Array<number>(EMBEDDING_DIMENSION);
    let norm = 0.0;

    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      // Linear congruential generator step
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const val = (seed / 4294967296.0) * 2.0 - 1.0;
      vector[i] = val;
      norm += val * val;
    }

    const sqrtNorm = Math.sqrt(norm) || 1.0;
    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      vector[i] = vector[i] / sqrtNorm;
    }

    return vector;
  }
}

export const geminiEmbeddingService = new GeminiEmbeddingService();
