package com.wealthtech.crm.modules.portfolioreview.eval;

import java.io.InputStream;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wealthtech.crm.infrastructure.ai.GeminiEmbeddingService;
import com.wealthtech.crm.infrastructure.ai.GeminiGenerationService;
import com.wealthtech.crm.infrastructure.config.ResilienceProperties;
import com.wealthtech.crm.modules.portfolioreview.eval.evaluator.FactCheckingEvaluator;
import com.wealthtech.crm.modules.portfolioreview.eval.evaluator.RelevancyEvaluator;
import com.wealthtech.crm.modules.portfolioreview.eval.model.EvaluationRequest;
import com.wealthtech.crm.modules.portfolioreview.eval.model.EvaluationResponse;
import com.wealthtech.crm.modules.portfolioreview.eval.model.GoldenDatasetEntry;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

@ExtendWith(MockitoExtension.class)
class RagGenerationBenchmarkTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private List<GoldenDatasetEntry> goldenDataset;

    @Mock
    private GeminiGenerationService mockGenerationService;

    private GeminiEmbeddingService embeddingService;

    @BeforeEach
    void setUp() throws Exception {
        try (InputStream is = getClass().getResourceAsStream("/eval/golden_dataset.json")) {
            assertThat(is).as("golden_dataset.json must exist in test classpath").isNotNull();
            goldenDataset = objectMapper.readValue(is, new TypeReference<List<GoldenDatasetEntry>>() {});
        }

        ResilienceProperties properties = new ResilienceProperties();
        embeddingService = new GeminiEmbeddingService(
                "",
                "https://generativelanguage.googleapis.com/v1beta/models",
                "text-embedding-004",
                properties,
                new SimpleMeterRegistry()
        );
    }

    @Test
    @DisplayName("Should evaluate Answer Relevance using Semantic Embedding Cosine Similarity across Golden Dataset")
    void testGoldenDatasetSemanticRelevancyWithEmbeddings() {
        RelevancyEvaluator evaluator = new RelevancyEvaluator(embeddingService, null, 0.40);

        for (GoldenDatasetEntry entry : goldenDataset) {
            EvaluationRequest request = EvaluationRequest.builder()
                    .userText(entry.getQuestion())
                    .contextList(entry.getGroundTruthContextChunks())
                    .responseContent(entry.getGroundTruthAnswer())
                    .build();

            EvaluationResponse response = evaluator.evaluate(request);

            assertThat(response.isPass())
                    .as("Query '%s' must meet semantic relevance threshold", entry.getId())
                    .isTrue();
            assertThat(response.getScore())
                    .as("Cosine similarity for '%s' should be positive and relevant", entry.getId())
                    .isGreaterThan(0.40f);
        }
    }

    @Test
    @DisplayName("Should reject completely off-topic responses via Embedding Cosine Similarity")
    void testEmbeddingRelevancyRejectsOffTopicResponse() {
        RelevancyEvaluator evaluator = new RelevancyEvaluator(embeddingService, null, 0.40);

        EvaluationRequest offTopicRequest = EvaluationRequest.builder()
                .userText("What is the Total Expense Ratio for Parag Parikh Flexi Cap Fund Direct Plan?")
                .contextList(List.of("Parag Parikh Flexi Cap Fund Direct Plan Total Expense Ratio is 0.63%."))
                .responseContent("The recipe for baking blueberry muffins requires flour, sugar, baking powder, and fresh berries.")
                .build();

        EvaluationResponse response = evaluator.evaluate(offTopicRequest);

        assertThat(response.isPass())
                .as("Unrelated topic must fail Answer Relevance threshold")
                .isFalse();
    }

    @Test
    @DisplayName("Should verify FactCheckingEvaluator correctly passes compliant LLM Judge output")
    void testFactCheckingPassesCompliantLlmVerdict() {
        when(mockGenerationService.generateGroundedResponse(anyString(), anyString(), anyDouble()))
                .thenReturn("VERDICT: PASS\nSCORE: 0.98\nREASONING: All facts directly supported by SID evidence.");

        FactCheckingEvaluator evaluator = new FactCheckingEvaluator(mockGenerationService, 0.95);

        EvaluationRequest request = EvaluationRequest.builder()
                .userText("What is the exit load?")
                .contextList(List.of("Exit load is Nil after 7 days."))
                .responseContent("There is no exit load after 7 days.")
                .build();

        EvaluationResponse response = evaluator.evaluate(request);

        assertThat(response.isPass()).isTrue();
        assertThat(response.getScore()).isEqualTo(0.98f);
        assertThat(response.getMetadata().get("judgeType")).isEqualTo("LLM_GEMINI");
    }

    @Test
    @DisplayName("Should verify FactCheckingEvaluator flags SEBI non-compliance when LLM Judge detects hallucinations")
    void testFactCheckingRejectsHallucinationLlmVerdict() {
        when(mockGenerationService.generateGroundedResponse(anyString(), anyString(), anyDouble()))
                .thenReturn("VERDICT: FAIL\nSCORE: 0.15\nREASONING: Fabricated guaranteed return of 99.9% not found in context.");

        FactCheckingEvaluator evaluator = new FactCheckingEvaluator(mockGenerationService, 0.95);

        EvaluationRequest request = EvaluationRequest.builder()
                .userText("What is the return?")
                .contextList(List.of("1-year CAGR is 14.5%."))
                .responseContent("The fund guarantees a return of 99.9% risk free.")
                .build();

        EvaluationResponse response = evaluator.evaluate(request);

        assertThat(response.isPass())
                .as("Hallucinated response must be flagged as failed")
                .isFalse();
        assertThat(response.getScore()).isLessThan(0.95f);
    }

    @Test
    @DisplayName("Should defensively handle blank or null requests across both evaluators")
    void testDefensiveHandlingOfBlankInputs() {
        FactCheckingEvaluator factChecker = new FactCheckingEvaluator(mockGenerationService, 0.95);
        RelevancyEvaluator relevancyEvaluator = new RelevancyEvaluator(embeddingService);

        EvaluationResponse r1 = factChecker.evaluate(null);
        assertThat(r1.isPass()).isFalse();

        EvaluationResponse r2 = relevancyEvaluator.evaluate(EvaluationRequest.builder().responseContent("   ").build());
        assertThat(r2.isPass()).isFalse();
    }
}
