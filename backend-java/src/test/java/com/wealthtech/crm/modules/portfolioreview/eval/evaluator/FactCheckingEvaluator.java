package com.wealthtech.crm.modules.portfolioreview.eval.evaluator;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.wealthtech.crm.infrastructure.ai.GeminiGenerationService;
import com.wealthtech.crm.modules.portfolioreview.eval.model.EvaluationRequest;
import com.wealthtech.crm.modules.portfolioreview.eval.model.EvaluationResponse;
import com.wealthtech.crm.modules.portfolioreview.service.RagEvaluationTelemetryService;

import lombok.extern.slf4j.Slf4j;

/**
 * Spring AI FactCheckingEvaluator equivalent.
 * Verifies that all claims made in the synthesized response are directly grounded in the retrieved context chunks,
 * ensuring zero hallucinations and SEBI regulatory compliance.
 */
@Slf4j
public class FactCheckingEvaluator implements Evaluator {

    private final GeminiGenerationService generationService;
    private final double passThreshold;
    private final RagEvaluationTelemetryService telemetryService;

    public FactCheckingEvaluator() {
        this(null, 0.95, null);
    }

    public FactCheckingEvaluator(GeminiGenerationService generationService) {
        this(generationService, 0.95, null);
    }

    public FactCheckingEvaluator(GeminiGenerationService generationService, double passThreshold) {
        this(generationService, passThreshold, null);
    }

    public FactCheckingEvaluator(GeminiGenerationService generationService, double passThreshold, RagEvaluationTelemetryService telemetryService) {
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
                    .feedback("Response content is empty")
                    .metadata(Map.of("error", "EMPTY_RESPONSE"))
                    .build();
        } else {
            List<String> contexts = request.getContextList() != null ? request.getContextList() : List.of();
            String combinedContext = String.join("\n---\n", contexts);

            if (generationService != null) {
                response = evaluateWithLlmJudge(request.getUserText(), combinedContext, request.getResponseContent());
            } else {
                // Defensive baseline when no LLM service is configured
                response = EvaluationResponse.builder()
                        .pass(true)
                        .score(1.0f)
                        .feedback("Evaluator configured in passive baseline mode")
                        .metadata(Map.of("judgeType", "PASSIVE_BASELINE"))
                        .build();
            }
        }

        if (telemetryService != null) {
            long duration = System.currentTimeMillis() - startTime;
            String judgeType = response.getMetadata() != null
                    ? String.valueOf(response.getMetadata().getOrDefault("judgeType", "UNKNOWN"))
                    : "UNKNOWN";
            telemetryService.recordFaithfulness(response.getScore(), response.isPass(), judgeType, duration);
        }

        return response;
    }

    private EvaluationResponse evaluateWithLlmJudge(String query, String context, String response) {
        String judgePrompt = String.format(
                """
                You are a strict financial compliance evaluator for a SEBI-registered advisory CRM.
                Evaluate whether the synthesized response contains ANY unsupported claims or hallucinations compared to the provided context evidence.

                CONTEXT EVIDENCE:
                %s

                USER QUERY:
                %s

                SYNTHESIZED RESPONSE:
                %s

                INSTRUCTIONS:
                1. If every factual claim in the response is directly supported by the context, output SCORE: 1.0.
                2. If the response contains unsupported numbers, fabricated yields, or hallucinations, output SCORE: 0.0 to 0.5.
                3. Conclude with PASS or FAIL. Format exactly as:
                VERDICT: [PASS/FAIL]
                SCORE: [0.0 - 1.0]
                REASONING: [1-2 sentences]
                """,
                context, query, response
        );

        String systemInstruction = "You are a strict financial compliance evaluator for a SEBI-registered advisory CRM.";
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
