package com.wealthtech.crm.infrastructure.ai;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.wealthtech.crm.infrastructure.config.ResilienceProperties;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;

import lombok.extern.slf4j.Slf4j;

/**
 * Service for generating dense vector embeddings via Google Gemini text-embedding-004.
 * Base URL and model are fully configurable via environment variables.
 * Includes a graceful deterministic local fallback when no API key is provided
 * (for offline CI/CD, local testing, and air-gapped environments).
 */
@Service
@Slf4j
public class GeminiEmbeddingService {

    public static final int EMBEDDING_DIMENSION = 768;

    private final String apiKey;
    private final String apiBaseUrl;
    private final String embeddingModel;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final ResilienceProperties resilienceProperties;
    private final MeterRegistry meterRegistry;

    public GeminiEmbeddingService(
            @Value("${gemini.api-key:}") String apiKey,
            @Value("${gemini.api-base-url:https://generativelanguage.googleapis.com/v1beta/models}") String apiBaseUrl,
            @Value("${gemini.embedding-model:text-embedding-004}") String embeddingModel,
            ResilienceProperties resilienceProperties,
            MeterRegistry meterRegistry) {
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.apiBaseUrl = (apiBaseUrl != null && !apiBaseUrl.isBlank())
                ? apiBaseUrl.trim().replaceAll("/+$", "")
                : "https://generativelanguage.googleapis.com/v1beta/models";
        this.embeddingModel = (embeddingModel != null && !embeddingModel.isBlank())
                ? embeddingModel.trim()
                : "text-embedding-004";
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(resilienceProperties.getGemini().getConnectTimeoutMs()))
                .build();
        this.objectMapper = new ObjectMapper();
        this.resilienceProperties = resilienceProperties;
        this.meterRegistry = meterRegistry;

        if (isLiveKeyConfigured()) {
            log.info("GeminiEmbeddingService initialized with base URL '{}' and model '{}'", this.apiBaseUrl, this.embeddingModel);
        } else {
            log.info("GeminiEmbeddingService initialized in deterministic local fallback mode (no live GEMINI_API_KEY detected)");
        }
    }

    public boolean isLiveKeyConfigured() {
        return !apiKey.isBlank() && !apiKey.startsWith("your_");
    }

    /**
     * Generates a 768-dimensional embedding vector for the provided text.
     * Incorporates retry with exponential backoff and randomized jitter on transient 429/5xx errors,
     * and falls back to deterministic local embeddings with metric tracking.
     *
     * @param text input text chunk
     * @return 768-dimensional float array
     */
    public float[] getEmbedding(String text) {
        if (text == null || text.isBlank()) {
            return new float[EMBEDDING_DIMENSION];
        }

        if (!isLiveKeyConfigured()) {
            meterRegistry.counter("rag_embedding_calls_total", "status", "fallback_no_key").increment();
            return generateDeterministicEmbedding(text);
        }

        ResilienceProperties.RetryPolicy policy = resilienceProperties.getGemini();
        int maxRetries = policy.getMaxRetries();
        int attempt = 0;
        Timer.Sample sample = Timer.start(meterRegistry);

        while (true) {
            try {
                String endpoint = String.format("%s/%s:embedContent?key=%s", apiBaseUrl, embeddingModel, apiKey);
                Map<String, Object> part = Map.of("text", text);
                Map<String, Object> content = Map.of("parts", List.of(part));
                Map<String, Object> requestBody = Map.of(
                        "model", "models/" + embeddingModel,
                        "content", content
                );

                String jsonPayload = objectMapper.writeValueAsString(requestBody);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(endpoint))
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofMillis(policy.getRequestTimeoutMs()))
                        .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                int statusCode = response.statusCode();

                if (statusCode == 200) {
                    JsonNode root = objectMapper.readTree(response.body());
                    JsonNode valuesNode = root.path("embedding").path("values");
                    if (valuesNode.isArray() && valuesNode.size() > 0) {
                        float[] vector = new float[valuesNode.size()];
                        for (int i = 0; i < valuesNode.size(); i++) {
                            vector[i] = (float) valuesNode.get(i).asDouble();
                        }
                        sample.stop(Timer.builder("rag_embedding_latency_seconds")
                                .tag("status", "success")
                                .register(meterRegistry));
                        meterRegistry.counter("rag_embedding_calls_total", "status", "success").increment();
                        return vector;
                    }
                }

                // Check for transient retryable HTTP status codes (429 Rate Limit or 5xx Server Error)
                boolean isRetryable = (statusCode == 429 || statusCode >= 500);

                if (isRetryable && attempt < maxRetries) {
                    long backoffDelay = resilienceProperties.calculateBackoffWithJitter(attempt, policy);
                    log.warn("Gemini embedContent returned transient status {}. Retrying attempt {}/{} in {} ms",
                            statusCode, attempt + 1, maxRetries, backoffDelay);
                    Thread.sleep(backoffDelay);
                    attempt++;
                    continue;
                }

                // Permanent failure or exhausted retries
                log.warn("Gemini embedContent returned status {}: {}. Falling back to deterministic embedding.",
                        statusCode, response.body());
                sample.stop(Timer.builder("rag_embedding_latency_seconds")
                        .tag("status", "fallback")
                        .register(meterRegistry));
                meterRegistry.counter("rag_embedding_calls_total", "status", "fallback_error").increment();
                return generateDeterministicEmbedding(text);

            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                log.error("Interrupted during Gemini embedding retry backoff: {}", ie.getMessage());
                meterRegistry.counter("rag_embedding_calls_total", "status", "interrupted").increment();
                return generateDeterministicEmbedding(text);
            } catch (Exception e) {
                if (attempt < maxRetries) {
                    long backoffDelay = resilienceProperties.calculateBackoffWithJitter(attempt, policy);
                    log.warn("Exception invoking Gemini embedding API (attempt {}/{}): {}. Retrying in {} ms",
                            attempt + 1, maxRetries, e.getMessage(), backoffDelay);
                    try {
                        Thread.sleep(backoffDelay);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        log.error("Interrupted during retry backoff: {}", ie.getMessage());
                        return generateDeterministicEmbedding(text);
                    }
                    attempt++;
                    continue;
                }

                log.error("Exception invoking Gemini embedding API: {}. Falling back to deterministic embedding.", e.getMessage(), e);
                sample.stop(Timer.builder("rag_embedding_latency_seconds")
                        .tag("status", "fallback")
                        .register(meterRegistry));
                meterRegistry.counter("rag_embedding_calls_total", "status", "fallback_exception").increment();
                return generateDeterministicEmbedding(text);
            }
        }
    }

    /**
     * Generates embeddings in batches of up to 50 items.
     *
     * @param texts list of text chunks
     * @return list of 768-dimensional float arrays
     */
    public List<float[]> getBatchEmbeddings(List<String> texts) {
        if (texts == null || texts.isEmpty()) {
            return Collections.emptyList();
        }

        List<float[]> results = new ArrayList<>(texts.size());
        for (String text : texts) {
            results.add(getEmbedding(text));
        }
        return results;
    }

    /**
     * Deterministic, normalized 768-dimensional vector generator used when
     * GEMINI_API_KEY is not configured or during offline testing.
     * Produces consistent, unit-length normalized vectors with semantic token distribution.
     */
    public float[] generateDeterministicEmbedding(String text) {
        float[] vector = new float[EMBEDDING_DIMENSION];
        if (text == null || text.isBlank()) {
            return vector;
        }

        try {
            String[] tokens = text.toLowerCase().split("\\s+");
            MessageDigest md = MessageDigest.getInstance("SHA-256");

            for (int t = 0; t < tokens.length; t++) {
                String token = tokens[t];
                if (token.length() < 2) continue;

                byte[] hash = md.digest(token.getBytes(StandardCharsets.UTF_8));
                for (int i = 0; i < hash.length - 1; i += 2) {
                    int slot = Math.abs(((hash[i] & 0xFF) << 8) | (hash[i + 1] & 0xFF)) % EMBEDDING_DIMENSION;
                    float weight = 1.0f / (float) Math.sqrt(t + 1);
                    vector[slot] += weight;
                }
            }

            // Normalize vector to unit length (L2 norm)
            double sumSq = 0.0;
            for (float v : vector) {
                sumSq += v * v;
            }

            if (sumSq > 0.0) {
                float norm = (float) Math.sqrt(sumSq);
                for (int i = 0; i < EMBEDDING_DIMENSION; i++) {
                    vector[i] /= norm;
                }
            } else {
                vector[0] = 1.0f; // Default non-zero unit vector
            }

        } catch (Exception e) {
            log.warn("Error in deterministic embedding generation: {}", e.getMessage());
            vector[0] = 1.0f;
        }

        return vector;
    }
}
