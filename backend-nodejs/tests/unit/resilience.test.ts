import { describe, it, expect, vi } from 'vitest';
import { calculateBackoffWithJitter, withRetryAndBackoff } from '../../src/common/utils/resilience';
import { RetryPolicy } from '../../src/config/resilience';

describe('Resilience & Retry Utility with Jitter', () => {
  const samplePolicy: RetryPolicy = {
    maxRetries: 3,
    baseDelayMs: 10,
    maxDelayMs: 100,
    jitterPercent: 20,
    connectTimeoutMs: 500,
    requestTimeoutMs: 1000,
  };

  describe('calculateBackoffWithJitter', () => {
    it('should calculate exponential backoff scaled by attempt', () => {
      const delayAttempt0 = calculateBackoffWithJitter(0, { ...samplePolicy, jitterPercent: 0 });
      const delayAttempt1 = calculateBackoffWithJitter(1, { ...samplePolicy, jitterPercent: 0 });
      const delayAttempt2 = calculateBackoffWithJitter(2, { ...samplePolicy, jitterPercent: 0 });

      expect(delayAttempt0).toBe(10);  // 10 * 2^0
      expect(delayAttempt1).toBe(20);  // 10 * 2^1
      expect(delayAttempt2).toBe(40);  // 10 * 2^2
    });

    it('should cap delay at maxDelayMs', () => {
      const largeAttemptDelay = calculateBackoffWithJitter(10, { ...samplePolicy, jitterPercent: 0 });
      expect(largeAttemptDelay).toBe(samplePolicy.maxDelayMs);
    });

    it('should keep delay within jitter percentage bounds', () => {
      const policy: RetryPolicy = { ...samplePolicy, baseDelayMs: 100, maxDelayMs: 1000, jitterPercent: 20 };
      for (let i = 0; i < 20; i++) {
        const delay = calculateBackoffWithJitter(0, policy);
        expect(delay).toBeGreaterThanOrEqual(80);  // 100 - 20%
        expect(delay).toBeLessThanOrEqual(120);    // 100 + 20%
      }
    });
  });

  describe('withRetryAndBackoff', () => {
    it('should return result on first attempt when operation succeeds', async () => {
      const op = vi.fn().mockResolvedValue('success_data');

      const result = await withRetryAndBackoff(op, samplePolicy, 'test-op');

      expect(result).toBe('success_data');
      expect(op).toHaveBeenCalledTimes(1);
    });

    it('should retry after transient failure and return result on subsequent success', async () => {
      const op = vi
        .fn()
        .mockRejectedValueOnce(new Error('transient 503'))
        .mockResolvedValueOnce('recovered_data');

      const result = await withRetryAndBackoff(op, samplePolicy, 'test-op');

      expect(result).toBe('recovered_data');
      expect(op).toHaveBeenCalledTimes(2);
    });

    it('should exhaust retries and throw error after maxRetries exceeded', async () => {
      const op = vi.fn().mockRejectedValue(new Error('persistent failure'));

      await expect(
        withRetryAndBackoff(op, samplePolicy, 'test-op')
      ).rejects.toThrow('persistent failure');

      expect(op).toHaveBeenCalledTimes(samplePolicy.maxRetries + 1);
    });

    it('should stop retrying immediately when isRetryableError returns false', async () => {
      const op = vi.fn().mockRejectedValue(new Error('non-retryable 400 Bad Request'));

      await expect(
        withRetryAndBackoff(
          op,
          samplePolicy,
          'test-op',
          (err) => !(err instanceof Error && err.message.includes('400'))
        )
      ).rejects.toThrow('non-retryable 400 Bad Request');

      expect(op).toHaveBeenCalledTimes(1);
    });
  });
});
