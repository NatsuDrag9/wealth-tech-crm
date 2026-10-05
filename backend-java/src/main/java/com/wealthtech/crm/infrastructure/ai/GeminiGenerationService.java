package com.wealthtech.crm.infrastructure.ai;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wealthtech.crm.infrastructure.config.ResilienceProperties;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for generating grounded LLM responses via Google Gemini 2.0 Flash.
 * Features:
 * - Dynamic timeout configuration via ResilienceProperties
 * - Configurable temperature for high factual accuracy
 * - Exponential backoff and randomized jitter on 429/5xx transient errors
 * - Deterministic local fallback for offline/CI environments
 * - Micrometer latency and call status telemetry
 */
@Service
@Slf4j
public class GeminiGenerationService {

    private final String apiKey;
    private final String apiBaseUrl;
    private final String generationModel;
    private final double defaultTemperature;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final ResilienceProperties resilienceProperties;
    private final MeterRegistry meterRegistry;

    public GeminiGenerationService(
            @Value("${gemini.api-key:}") String apiKey,
            @Value("${gemini.api-base-url:https://generativelanguage.googleapis.com/v1beta/models}") String apiBaseUrl,
            @Value("${gemini.generation-model:gemini-2.0-flash}") String generationModel,
            @Value("${gemini.generation-temperature:0.1}") double defaultTemperature,
            ObjectMapper objectMapper,
            ResilienceProperties resilienceProperties,
            MeterRegistry meterRegistry) {
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.apiBaseUrl = (apiBaseUrl != null && !apiBaseUrl.isBlank())
                ? apiBaseUrl.trim().replaceAll("/+$", "")
                : "https://generativelanguage.googleapis.com/v1beta/models";
        this.generationModel = (generationModel != null && !generationModel.isBlank())
                ? generationModel.trim()
                : "gemini-2.0-flash";
        this.defaultTemperature = defaultTemperature;
        this.objectMapper = objectMapper;
        this.resilienceProperties = resilienceProperties;
        this.meterRegistry = meterRegistry;

        long connectTimeoutMs = resilienceProperties.getGemini().getConnectTimeoutMs();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(connectTimeoutMs))
                .build();

        if (isLiveKeyConfigured()) {
            log.info("GeminiGenerationService initialized with model '{}' and default temperature {}",
                    this.generationModel, this.defaultTemperature);
        } else {
            log.info("GeminiGenerationService initialized in local fallback mode (no live GEMINI_API_KEY detected)");
        }
    }

    public boolean isLiveKeyConfigured() {
        return !apiKey.isBlank() && !apiKey.startsWith("your_");
    }

    /**
     * Synthesizes an answer using Gemini 2.0 Flash based strictly on grounded evidence.
     *
     * @param systemInstruction system-level guardrails and grounding instructions
     * @param userPrompt user question with embedded evidence blocks
     * @param temperatureOverride optional temperature override; falls back to defaultTemperature if null
     * @return generated answer text
     */
    public String generateGroundedResponse(String systemInstruction, String userPrompt, Double temperatureOverride) {
        if (userPrompt == null || userPrompt.isBlank()) {
            return "No prompt provided for generation.";
        }

        if (!isLiveKeyConfigured()) {
            meterRegistry.counter("rag_generation_calls_total", "status", "fallback_no_key").increment();
            return generateLocalFallback(userPrompt);
        }

        double resolvedTemperature = (temperatureOverride != null && temperatureOverride >= 0.0 && temperatureOverride <= 1.0)
                ? temperatureOverride
                : defaultTemperature;

        ResilienceProperties.RetryPolicy policy = resilienceProperties.getGemini();
        int maxRetries = policy.getMaxRetries();
        int attempt = 0;
        Timer.Sample sample = Timer.start(meterRegistry);

        while (true) {
            try {
                String endpoint = String.format("%s/%s:generateContent?key=%s", apiBaseUrl, generationModel, apiKey);

                Map<String, Object> contentsPart = Map.of("text", userPrompt);
                Map<String, Object> content = Map.of("role", "user", "parts", List.of(contentsPart));

                Map<String, Object> systemPart = Map.of("text", systemInstruction);
                Map<String, Object> systemInstructionNode = Map.of("parts", List.of(systemPart));

                Map<String, Object> generationConfig = Map.of(
                        "temperature", resolvedTemperature,
                        "maxOutputTokens", 2048
                );

                Map<String, Object> requestBody = Map.of(
                        "systemInstruction", systemInstructionNode,
                        "contents", List.of(content),
                        "generationConfig", generationConfig
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
                    JsonNode textNode = root.path("candidates")
                            .path(0)
                            .path("content")
                            .path("parts")
                            .path(0)
                            .path("text");

                    if (!textNode.isMissingNode()) {
                        sample.stop(Timer.builder("rag_generation_latency_seconds")
                                .tag("status", "success")
                                .register(meterRegistry));
                        meterRegistry.counter("rag_generation_calls_total", "status", "success").increment();
                        return textNode.asText().trim();
                    }
                }

                boolean isRetryable = (statusCode == 429 || statusCode >= 500);

                if (isRetryable && attempt < maxRetries) {
                    long backoffDelay = resilienceProperties.calculateBackoffWithJitter(attempt, policy);
                    log.warn("Gemini generateContent returned transient status {}. Retrying attempt {}/{} in {} ms",
                            statusCode, attempt + 1, maxRetries, backoffDelay);
                    Thread.sleep(backoffDelay);
                    attempt++;
                    continue;
                }

                log.warn("Gemini generateContent returned status {}: {}. Falling back to local generation.",
                        statusCode, response.body());
                sample.stop(Timer.builder("rag_generation_latency_seconds")
                        .tag("status", "fallback")
                        .register(meterRegistry));
                meterRegistry.counter("rag_generation_calls_total", "status", "fallback_error").increment();
                return generateLocalFallback(userPrompt);

            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                log.error("Interrupted during Gemini generation retry backoff: {}", ie.getMessage());
                meterRegistry.counter("rag_generation_calls_total", "status", "interrupted").increment();
                return generateLocalFallback(userPrompt);
            } catch (Exception e) {
                if (attempt < maxRetries) {
                    long backoffDelay = resilienceProperties.calculateBackoffWithJitter(attempt, policy);
                    log.warn("Exception invoking Gemini generation API (attempt {}/{}): {}. Retrying in {} ms",
                            attempt + 1, maxRetries, e.getMessage(), backoffDelay);
                    try {
                        Thread.sleep(backoffDelay);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        log.error("Interrupted during retry backoff: {}", ie.getMessage());
                        return generateLocalFallback(userPrompt);
                    }
                    attempt++;
                    continue;
                }

                log.error("Exception invoking Gemini generation API: {}. Falling back to local synthesis.", e.getMessage(), e);
                sample.stop(Timer.builder("rag_generation_latency_seconds")
                        .tag("status", "fallback")
                        .register(meterRegistry));
                meterRegistry.counter("rag_generation_calls_total", "status", "fallback_exception").increment();
                return generateLocalFallback(userPrompt);
            }
        }
    }

    private String generateLocalFallback(String prompt) {
        return "Based on the retrieved disclosure records, the verified fund documents contain official statistics on portfolio allocation, expense ratios, and investment mandates. [Offline Synthesis Mode: Configured GEMINI_API_KEY required for dynamic natural language reasoning]";
    }
}
