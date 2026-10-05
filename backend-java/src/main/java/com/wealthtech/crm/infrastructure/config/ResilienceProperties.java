package com.wealthtech.crm.infrastructure.config;

import java.util.concurrent.ThreadLocalRandom;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import lombok.Getter;
import lombok.Setter;

/**
 * Centralized resilience configuration binding for timeouts, retries, and jitter.
 * Provides hierarchical inheritance from global defaults to domain contexts.
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "resilience")
public class ResilienceProperties {

    private RetryPolicy defaults = new RetryPolicy();
    private RetryPolicy gemini = new RetryPolicy();
    private RetryPolicy s3 = new RetryPolicy();
    private RetryPolicy ingestion = new RetryPolicy();

    @Getter
    @Setter
    public static class RetryPolicy {
        private int maxRetries = 3;
        private long baseDelayMs = 500;
        private long maxDelayMs = 5000;
        private int jitterPercent = 20;
        private long connectTimeoutMs = 15000;
        private long requestTimeoutMs = 30000;
    }

    /**
     * Calculates exponential backoff with randomized jitter for a retry attempt.
     * Prevents thundering herd spikes during transient upstream failures.
     *
     * @param attempt zero-indexed retry attempt (0, 1, 2, ...)
     * @param policy  the specific RetryPolicy configuration
     * @return sleep duration in milliseconds
     */
    public long calculateBackoffWithJitter(int attempt, RetryPolicy policy) {
        long rawBackoff = policy.getBaseDelayMs() * (1L << Math.min(attempt, 30));
        long cappedDelay = Math.min(rawBackoff, policy.getMaxDelayMs());

        double jitterRange = policy.getJitterPercent() / 100.0;
        double factor = 1.0 + ThreadLocalRandom.current().nextDouble(-jitterRange, jitterRange);

        return Math.max(10, (long) (cappedDelay * factor));
    }
}
