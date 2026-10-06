package com.wealthtech.crm.infrastructure.ai;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.Mock;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import com.wealthtech.crm.infrastructure.config.ResilienceProperties;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class GeminiGenerationServiceTest {

    @Mock
    private HttpClient mockHttpClient;
    @Mock
    private HttpResponse<String> mockResponsePrimary;
    @Mock
    private HttpResponse<String> mockResponseFallback;

    private ResilienceProperties resilienceProperties;
    private SimpleMeterRegistry meterRegistry;
    private GeminiGenerationService generationService;

    @BeforeEach
    void setUp() {
        resilienceProperties = new ResilienceProperties();
        resilienceProperties.getGemini().setMaxRetries(2);
        resilienceProperties.getGemini().setBaseDelayMs(10);
        resilienceProperties.getGemini().setMaxDelayMs(50);
        resilienceProperties.getGemini().setRequestTimeoutMs(5000);

        meterRegistry = new SimpleMeterRegistry();

        generationService = new GeminiGenerationService(
                "valid-test-key-12345",
                "https://generativelanguage.googleapis.com/v1beta/models",
                "gemini-3.8-flash",
                0.1,
                resilienceProperties,
                meterRegistry
        );

        // Inject mocked HttpClient into service
        ReflectionTestUtils.setField(generationService, "httpClient", mockHttpClient);
    }

    @Test
    @DisplayName("Should immediately cascade to fallback model when primary model returns HTTP 429 quota exhaustion")
    void testCascadesToFallbackModelOnHttp429QuotaExhaustion() throws Exception {
        // Primary model (gemini-3.8-flash) returns 429 Quota Exhausted
        when(mockResponsePrimary.statusCode()).thenReturn(429);
        when(mockResponsePrimary.body()).thenReturn("{\"error\":{\"code\":429,\"message\":\"Quota exceeded\"}}");

        // First fallback model (gemini-3.5-flash) succeeds with HTTP 200
        when(mockResponseFallback.statusCode()).thenReturn(200);
        when(mockResponseFallback.body()).thenReturn("""
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          { "text": "Synthesized successfully via fallback model gemini-3.5-flash." }
                        ]
                      }
                    }
                  ]
                }
                """);

        doReturn(mockResponsePrimary)
                .doReturn(mockResponseFallback)
                .when(mockHttpClient).send(any(HttpRequest.class), any());

        String answer = generationService.generateGroundedResponse(
                "System instruction",
                "What is the expense ratio?",
                0.1
        );

        assertThat(answer).isEqualTo("Synthesized successfully via fallback model gemini-3.5-flash.");
        assertThat(GeminiGenerationService.isSynthesisUnavailable(answer)).isFalse();

        // Verify primary model was NOT retried on 429 (only called once before cascading)
        verify(mockHttpClient, times(2)).send(any(HttpRequest.class), any());
        assertThat(meterRegistry.get("rag_generation_calls_total").tag("status", "quota_exhausted").counter().count()).isEqualTo(1.0);
        assertThat(meterRegistry.get("rag_generation_calls_total").tag("status", "cascade_gemini-3.5-flash").counter().count()).isEqualTo(1.0);
    }

    @Test
    @DisplayName("Should return honest SYNTHESIS_UNAVAILABLE sentinel when all models in cascade exhaust quota")
    void testReturnsHonestSentinelWhenAllCascadeModelsExhausted() throws Exception {
        HttpResponse<String> mock429 = mockResponsePrimary;
        when(mock429.statusCode()).thenReturn(429);
        when(mock429.body()).thenReturn("{\"error\":{\"code\":429,\"message\":\"Quota exceeded\"}}");

        // Primary (gemini-3.8-flash) + Fallback 1 (gemini-3.5-flash) + Fallback 2 (gemini-flash-latest) all return 429
        doReturn(mock429)
                .doReturn(mock429)
                .doReturn(mock429)
                .when(mockHttpClient).send(any(HttpRequest.class), any());

        String answer = generationService.generateGroundedResponse(
                "System instruction",
                "What is the expense ratio?",
                0.1
        );

        assertThat(answer).isEqualTo(GeminiGenerationService.SYNTHESIS_UNAVAILABLE_SENTINEL);
        assertThat(GeminiGenerationService.isSynthesisUnavailable(answer)).isTrue();
        assertThat(answer).doesNotContain("Offline Synthesis Mode");
        assertThat(meterRegistry.get("rag_generation_calls_total").tag("status", "all_quota_exhausted").counter().count()).isEqualTo(1.0);
    }

    @Test
    @DisplayName("Should retry transient HTTP 503 on the same model with backoff before succeeding")
    void testRetriesTransient503OnSameModelBeforeSuccess() throws Exception {
        HttpResponse<String> mock503 = mockResponsePrimary;
        when(mock503.statusCode()).thenReturn(503);
        when(mock503.body()).thenReturn("{\"error\":{\"code\":503,\"message\":\"Service Unavailable\"}}");

        HttpResponse<String> mock200 = mockResponseFallback;
        when(mock200.statusCode()).thenReturn(200);
        when(mock200.body()).thenReturn("""
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          { "text": "Recovered from 503 on same model." }
                        ]
                      }
                    }
                  ]
                }
                """);

        // First attempt 503, second attempt 200 on same model
        doReturn(mock503)
                .doReturn(mock200)
                .when(mockHttpClient).send(any(HttpRequest.class), any());

        String answer = generationService.generateGroundedResponse(
                "System instruction",
                "Explain riskometer",
                0.1
        );

        assertThat(answer).isEqualTo("Recovered from 503 on same model.");
        verify(mockHttpClient, times(2)).send(any(HttpRequest.class), any());
    }
}
