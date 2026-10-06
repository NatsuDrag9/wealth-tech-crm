package com.wealthtech.crm.modules.portfolioreview.eval;

import java.io.InputStream;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Assumptions;
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
import com.wealthtech.crm.modules.portfolioreview.service.RagEvaluationTelemetryService;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

@ExtendWith(MockitoExtension.class)
class RagGenerationBenchmarkTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private List<GoldenDatasetEntry> goldenDataset;

    @Mock
    private GeminiGenerationService mockGenerationService;

    private GeminiEmbeddingService embeddingService;
    private SimpleMeterRegistry meterRegistry;
    private RagEvaluationTelemetryService telemetryService;
    private String envApiKey;
    private boolean hasLiveKey;

    @BeforeEach
    void setUp() throws Exception {
        try (InputStream is = getClass().getResourceAsStream("/eval/golden_dataset.json")) {
            assertThat(is).as("golden_dataset.json must exist in test classpath").isNotNull();
            goldenDataset = objectMapper.readValue(is, new TypeReference<List<GoldenDatasetEntry>>() {});
        }

        meterRegistry = new SimpleMeterRegistry();
        telemetryService = new RagEvaluationTelemetryService(meterRegistry);

        envApiKey = System.getenv("GEMINI_API_KEY");
        hasLiveKey = envApiKey != null && !envApiKey.isBlank() && !envApiKey.startsWith("your_");

        String apiBaseUrl = System.getenv("GEMINI_API_BASE_URL");
        if (apiBaseUrl == null || apiBaseUrl.isBlank()) {
            apiBaseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
        }
        String embeddingModel = System.getenv("GEMINI_EMBEDDING_MODEL");
        if (embeddingModel == null || embeddingModel.isBlank()) {
            embeddingModel = "text-embedding-004";
        }

        ResilienceProperties properties = new ResilienceProperties();
        embeddingService = new GeminiEmbeddingService(
                hasLiveKey ? envApiKey : "",
                apiBaseUrl,
                embeddingModel,
                properties,
                meterRegistry
        );
    }

    @Test
    @DisplayName("Should evaluate Answer Relevance using Semantic Embedding Cosine Similarity across Golden Dataset")
    void testGoldenDatasetSemanticRelevancyWithEmbeddings() {
        RelevancyEvaluator evaluator = new RelevancyEvaluator(embeddingService, null, 0.40, telemetryService);

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

        // Verify telemetry gauges were updated
        assertThat(telemetryService.getLatestRelevancyScore()).isGreaterThan(0.40);
        assertThat(meterRegistry.get("rag.eval.runs.total").tag("evaluator", "relevancy").counter().count())
                .isEqualTo((double) goldenDataset.size());
    }

    @Test
    @DisplayName("Should reject completely off-topic responses via Embedding Cosine Similarity")
    void testEmbeddingRelevancyRejectsOffTopicResponse() {
        RelevancyEvaluator evaluator = new RelevancyEvaluator(embeddingService, null, 0.40, telemetryService);

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

        FactCheckingEvaluator evaluator = new FactCheckingEvaluator(mockGenerationService, 0.95, telemetryService);

        EvaluationRequest request = EvaluationRequest.builder()
                .userText("What is the exit load?")
                .contextList(List.of("Exit load is Nil after 7 days."))
                .responseContent("There is no exit load after 7 days.")
                .build();

        EvaluationResponse response = evaluator.evaluate(request);

        assertThat(response.isPass()).isTrue();
        assertThat(response.getScore()).isEqualTo(0.98f);
        assertThat(response.getMetadata().get("judgeType")).isEqualTo("LLM_GEMINI");
        assertThat(telemetryService.getLatestFaithfulnessScore()).isCloseTo(0.98, org.assertj.core.data.Offset.offset(0.001));
        assertThat(meterRegistry.get("rag.eval.runs.total").tag("evaluator", "fact_checking").counter().count()).isEqualTo(1.0);
    }

    @Test
    @DisplayName("Should verify FactCheckingEvaluator flags SEBI non-compliance when LLM Judge detects hallucinations")
    void testFactCheckingRejectsHallucinationLlmVerdict() {
        when(mockGenerationService.generateGroundedResponse(anyString(), anyString(), anyDouble()))
                .thenReturn("VERDICT: FAIL\nSCORE: 0.15\nREASONING: Fabricated guaranteed return of 99.9% not found in context.");

        FactCheckingEvaluator evaluator = new FactCheckingEvaluator(mockGenerationService, 0.95, telemetryService);

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
        assertThat(telemetryService.getLatestFaithfulnessScore()).isCloseTo(0.15, org.assertj.core.data.Offset.offset(0.001));
    }

    @Test
    @DisplayName("Should execute live Gemini LLM Grounded Generation and LLM Judge Evaluation when GEMINI_API_KEY is present")
    void testLiveGeminiGenerationAndJudgeEvaluation() {
        Assumptions.assumeTrue(hasLiveKey, "Skipping live LLM test: GEMINI_API_KEY is not configured in container/environment");

        String apiBaseUrl = System.getenv("GEMINI_API_BASE_URL");
        if (apiBaseUrl == null || apiBaseUrl.isBlank()) {
            apiBaseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
        }
        String generationModel = System.getenv("GEMINI_GENERATION_MODEL");
        if (generationModel == null || generationModel.isBlank()) {
            generationModel = "gemini-2.0-flash";
        }

        GeminiGenerationService liveGenerationService = new GeminiGenerationService(
                envApiKey,
                apiBaseUrl,
                generationModel,
                0.1,
                new ResilienceProperties(),
                meterRegistry
        );

        FactCheckingEvaluator liveFactChecker = new FactCheckingEvaluator(liveGenerationService, 0.85, telemetryService);
        RelevancyEvaluator liveRelevancy = new RelevancyEvaluator(embeddingService, liveGenerationService, 0.70, telemetryService);

        GoldenDatasetEntry entry = goldenDataset.get(0);
        String systemInstruction = """
            You are an expert SEBI-compliant Wealth Management Copilot for financial advisors.
            Answer the user's investment query using EXCLUSIVELY the provided Grounded Evidence.
            Every financial figure must have an inline citation. Never extrapolate statistics.
            """;
        String groundedPrompt = "EVIDENCE:\n" + String.join("\n", entry.getGroundTruthContextChunks()) +
                "\n\nUSER QUESTION: " + entry.getQuestion();

        String generatedAnswer = liveGenerationService.generateGroundedResponse(systemInstruction, groundedPrompt, 0.1);

        assertThat(generatedAnswer).isNotBlank();
        assertThat(generatedAnswer).doesNotContain("Offline Synthesis Mode");

        EvaluationRequest evalRequest = EvaluationRequest.builder()
                .userText(entry.getQuestion())
                .contextList(entry.getGroundTruthContextChunks())
                .responseContent(generatedAnswer)
                .build();

        // 1. Fact-checking / Faithfulness with real Gemini 2.0 Flash judge
        EvaluationResponse factCheckResult = liveFactChecker.evaluate(evalRequest);
        assertThat(factCheckResult.isPass()).as("Live LLM Judge must pass grounded response").isTrue();
        assertThat(factCheckResult.getScore()).isGreaterThanOrEqualTo(0.85f);

        // 2. Relevancy with real Gemini embeddings / judge
        EvaluationResponse relevancyResult = liveRelevancy.evaluate(evalRequest);
        assertThat(relevancyResult.isPass()).as("Live response must be semantically relevant to query").isTrue();
        assertThat(relevancyResult.getScore()).isGreaterThanOrEqualTo(0.70f);

        // 3. Verify telemetry meters were updated
        assertThat(telemetryService.getLatestFaithfulnessScore()).isEqualTo((double) factCheckResult.getScore());
        assertThat(telemetryService.getLatestRelevancyScore()).isEqualTo((double) relevancyResult.getScore());
        assertThat(meterRegistry.get("rag.eval.runs.total").tag("judge_type", "llm_gemini").counter().count()).isGreaterThanOrEqualTo(1.0);
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
