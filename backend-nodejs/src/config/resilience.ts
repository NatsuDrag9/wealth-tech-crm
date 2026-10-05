export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterPercent: number;
  connectTimeoutMs: number;
  requestTimeoutMs: number;
}

export interface ResilienceConfig {
  defaults: RetryPolicy;
  s3: RetryPolicy;
  ai: RetryPolicy;
}

const defaultPolicy: RetryPolicy = {
  maxRetries: Number(process.env.RESILIENCE_MAX_RETRIES) || 3,
  baseDelayMs: Number(process.env.RESILIENCE_BASE_DELAY_MS) || 500,
  maxDelayMs: Number(process.env.RESILIENCE_MAX_DELAY_MS) || 5000,
  jitterPercent: Number(process.env.RESILIENCE_JITTER_PERCENT) || 20,
  connectTimeoutMs: Number(process.env.RESILIENCE_CONNECT_TIMEOUT_MS) || 15000,
  requestTimeoutMs: Number(process.env.RESILIENCE_REQUEST_TIMEOUT_MS) || 30000,
};

export const resilienceConfig: ResilienceConfig = {
  defaults: defaultPolicy,
  s3: {
    ...defaultPolicy,
    maxRetries: Number(process.env.S3_MAX_RETRIES) || defaultPolicy.maxRetries,
    baseDelayMs: Number(process.env.S3_BASE_DELAY_MS) || defaultPolicy.baseDelayMs,
  },
  ai: {
    ...defaultPolicy,
    maxRetries: Number(process.env.AI_MAX_RETRIES) || 4,
    baseDelayMs: Number(process.env.AI_BASE_DELAY_MS) || 1000,
  },
};
