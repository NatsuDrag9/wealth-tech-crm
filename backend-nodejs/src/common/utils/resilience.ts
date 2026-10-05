import { logger } from './logger';
import { RetryPolicy } from '../../config/resilience';

/**
 * Calculates exponential backoff with randomized jitter.
 */
export function calculateBackoffWithJitter(attempt: number, policy: RetryPolicy): number {
  const rawBackoff = policy.baseDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(rawBackoff, policy.maxDelayMs);

  const jitterRange = policy.jitterPercent / 100;
  const factor = 1 + (Math.random() * (2 * jitterRange) - jitterRange);

  return Math.max(10, Math.round(cappedDelay * factor));
}

/**
 * Executes an operation with exponential backoff and randomized jitter.
 * Designed for safe, idempotent read or reversible network operations.
 */
export async function withRetryAndBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  policy: RetryPolicy,
  contextDescription: string,
  isRetryableError: (err: unknown) => boolean = () => true
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation(attempt);
    } catch (error: unknown) {
      if (attempt >= policy.maxRetries || !isRetryableError(error)) {
        logger.error(
          {
            error: error instanceof Error ? error.message : String(error),
            context: contextDescription,
            attempt,
            maxRetries: policy.maxRetries,
          },
          'Operation failed permanently or exhausted maximum retries'
        );
        throw error;
      }

      const delayMs = calculateBackoffWithJitter(attempt, policy);
      logger.warn(
        {
          error: error instanceof Error ? error.message : String(error),
          context: contextDescription,
          attempt: attempt + 1,
          nextRetryDelayMs: delayMs,
        },
        'Transient failure encountered; scheduling retry with backoff and jitter'
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt++;
    }
  }
}
