package com.wealthtech.crm.infrastructure.ai;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.wealthtech.crm.infrastructure.config.ResilienceProperties;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

class GeminiEmbeddingServiceTest {

    private GeminiEmbeddingService embeddingService;
    private SimpleMeterRegistry meterRegistry;
    private ResilienceProperties resilienceProperties;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        resilienceProperties = new ResilienceProperties();

        // Empty API key triggers offline deterministic mode
        embeddingService = new GeminiEmbeddingService(
                "",
                "https://generativelanguage.googleapis.com/v1beta/models",
                "text-embedding-004",
                resilienceProperties,
                meterRegistry
        );
    }

    @Test
    @DisplayName("Should detect that live API key is not configured and operate in fallback mode")
    void testLiveKeyNotConfigured() {
        assertThat(embeddingService.isLiveKeyConfigured()).isFalse();
    }

    @Test
    @DisplayName("Should generate deterministic normalized 768-dimensional vector in fallback mode")
    void testDeterministicEmbeddingGeneration() {
        String input = "HDFC Top 100 Scheme Information Document";

        float[] embedding1 = embeddingService.getEmbedding(input);
        float[] embedding2 = embeddingService.getEmbedding(input);

        assertThat(embedding1).hasSize(768);
        assertThat(embedding2).hasSize(768);

        // Deterministic: Identical inputs yield identical embeddings
        assertThat(embedding1).isEqualTo(embedding2);

        // Vector magnitude should be approximately normalized
        double sumSquares = 0.0;
        for (float val : embedding1) {
            sumSquares += val * val;
        }
        assertThat(Math.sqrt(sumSquares)).isBetween(0.95, 1.05);
    }

    @Test
    @DisplayName("Should return zero-vector for empty or null text")
    void testEmptyTextReturnsZeroVector() {
        float[] emptyResult = embeddingService.getEmbedding("");
        assertThat(emptyResult).hasSize(768);
        for (float val : emptyResult) {
            assertThat(val).isEqualTo(0.0f);
        }

        float[] nullResult = embeddingService.getEmbedding(null);
        assertThat(nullResult).hasSize(768);
        for (float val : nullResult) {
            assertThat(val).isEqualTo(0.0f);
        }
    }
}
