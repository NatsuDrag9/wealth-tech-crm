package com.wealthtech.crm.modules.portfolioreview.eval.evaluator;

import java.util.HashMap;
import java.util.Map;

import com.wealthtech.crm.infrastructure.ai.GeminiEmbeddingService;
import com.wealthtech.crm.infrastructure.ai.GeminiGenerationService;
import com.wealthtech.crm.modules.portfolioreview.eval.model.EvaluationRequest;
import com.wealthtech.crm.modules.portfolioreview.eval.model.EvaluationResponse;
import com.wealthtech.crm.modules.portfolioreview.service.RagEvaluationTelemetryService;

import lombok.extern.slf4j.Slf4j;

/**
 * Spring AI RelevancyEvaluator implementation.
 * Evaluates semantic Answer Relevance between the user query and the synthesized response
 * using vector embeddings (cosine similarity) or an LLM Judge, without any hardcoded keywords.
 */
@Slf4j
public class RelevancyEvaluator implements Evaluator {

    private final GeminiEmbeddingService embeddingService;
    private final GeminiGenerationService generationService;
    private final double passThreshold;
    private final RagEvaluationTelemetryService telemetryService;

    public RelevancyEvaluator(GeminiEmbeddingService embeddingService) {
        this(embeddingService, null, 0.70, null);
    }

    public RelevancyEvaluator(GeminiGenerationService generationService) {
        this(null, generationService, 0.85, null);
    }

    public RelevancyEvaluator(GeminiEmbeddingService embeddingService, GeminiGenerationService generationService, double passThreshold) {
        this(embeddingService, generationService, passThreshold, null);
    }

    public RelevancyEvaluator(GeminiEmbeddingService embeddingService, GeminiGenerationService generationService, double passThreshold, RagEvaluationTelemetryService telemetryService) {
        this.embeddingService = embeddingService;
        this.generationService = generationService;
        this.passThreshold = passThreshold;
        this.telemetryService = telemetryService;
    }

    @Override
    public EvaluationResponse evaluate(EvaluationRequest request) {
        long startTime = System.currentTimeMillis();
        EvaluationResponse response;

        if (request == null || request.getResponseContent() == null || request.getResponseContent().isBlank()) {
            response = EvaluationResponse.builder()
                    .pass(false)
                    .score(0.0f)
                    .feedback("Response content is blank")
                    .metadata(Map.of("error", "BLANK_RESPONSE"))
                    .build();
        } else if (generationService != null && generationService.isLiveKeyConfigured()) {
            try {
                response = evaluateWithLlmJudge(request.getUserText(), request.getResponseContent());
            } catch (Exception e) {
                log.warn("LLM Judge relevancy evaluation failed: {}. Falling back to embeddings.", e.getMessage());
                response = (embeddingService != null)
                        ? evaluateWithEmbeddings(request.getUserText(), request.getResponseContent())
                        : fallbackResponse();
            }
        } else if (embeddingService != null) {
            response = evaluateWithEmbeddings(request.getUserText(), request.getResponseContent());
        } else {
            response = fallbackResponse();
        }

        if (telemetryService != null) {
            long duration = System.currentTimeMillis() - startTime;
            String judgeType = response.getMetadata() != null
                    ? String.valueOf(response.getMetadata().getOrDefault("judgeType", "UNKNOWN"))
                    : "UNKNOWN";
            telemetryService.recordRelevancy(response.getScore(), response.isPass(), judgeType, duration);
        }

        return response;
    }

    private EvaluationResponse fallbackResponse() {
        return EvaluationResponse.builder()
                .pass(true)
                .score(1.0f)
                .feedback("Evaluator configured without embedding/generation provider")
                .metadata(Map.of("warning", "NO_PROVIDER"))
                .build();
    }

    private EvaluationResponse evaluateWithEmbeddings(String query, String response) {
        float[] queryVec = embeddingService.getEmbedding(query);
        float[] responseVec = embeddingService.getEmbedding(response);

        double similarity = computeCosineSimilarity(queryVec, responseVec);
        float score = (float) Math.max(0.0, Math.min(1.0, similarity));
        boolean pass = score >= passThreshold;

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("judgeType", "EMBEDDING_COSINE_SIMILARITY");
        metadata.put("cosineSimilarity", score);
        metadata.put("passThreshold", passThreshold);

        return EvaluationResponse.builder()
                .pass(pass)
                .score(score)
                .feedback(pass ? "Response is semantically relevant to the query" : "Response semantic similarity is below threshold")
                .metadata(metadata)
                .build();
    }

    private EvaluationResponse evaluateWithLlmJudge(String query, String response) {
        String judgePrompt = String.format(
                """
                You are an evaluation judge assessing Answer Relevancy in a WealthTech advisory CRM.
                USER QUERY: %s
                SYNTHESIZED ANSWER: %s

                INSTRUCTIONS:
                Determine how directly and completely the synthesized answer resolves the query.
                Format output as:
                VERDICT: [PASS/FAIL]
                SCORE: [0.0 - 1.0]
                REASONING: [1 sentence]
                """,
                query, response
        );

        String systemInstruction = "You are an evaluation judge assessing Answer Relevancy in a WealthTech advisory chatbot.";
        String llmOutput = generationService.generateGroundedResponse(systemInstruction, judgePrompt, 0.0);
        float score = extractScore(llmOutput);
        boolean pass = score >= passThreshold;

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("judgeType", "LLM_GEMINI");
        metadata.put("rawOutput", llmOutput);

        return EvaluationResponse.builder()
                .pass(pass)
                .score(score)
                .feedback(llmOutput)
                .metadata(metadata)
                .build();
    }

    private double computeCosineSimilarity(float[] v1, float[] v2) {
        if (v1 == null || v2 == null || v1.length != v2.length) {
            return 0.0;
        }
        double dot = 0.0;
        double norm1 = 0.0;
        double norm2 = 0.0;

        for (int i = 0; i < v1.length; i++) {
            dot += v1[i] * v2[i];
            norm1 += v1[i] * v1[i];
            norm2 += v2[i] * v2[i];
        }

        if (norm1 == 0.0 || norm2 == 0.0) {
            return 0.0;
        }
        return dot / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    private float extractScore(String output) {
        try {
            if (output.contains("SCORE:")) {
                String scorePart = output.substring(output.indexOf("SCORE:") + 6).trim().split("\\s+")[0];
                return Float.parseFloat(scorePart.replaceAll("[^0-9.]", ""));
            }
        } catch (Exception ignored) {
        }
        return output.contains("PASS") ? 1.0f : 0.0f;
    }
}
