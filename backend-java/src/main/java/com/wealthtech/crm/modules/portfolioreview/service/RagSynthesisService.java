package com.wealthtech.crm.modules.portfolioreview.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.wealthtech.crm.infrastructure.ai.GeminiGenerationService;
import com.wealthtech.crm.modules.portfolioreview.dto.*;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;

/**
 * Service orchestrating grounded RAG query synthesis:
 * 1. Executes candidate-constrained retrieval.
 * 2. Evaluates the Evidence Quality Gate.
 * 3. Triggers automated query refinement on quality gate failures.
 * 4. Assembles grounded context with explicit source anchors.
 * 5. Synthesizes factual natural-language answers via Gemini 2.0 Flash.
 * 6. Records granular end-to-end latency breakdowns.
 */
@Service
@Slf4j
public class RagSynthesisService {

    private final RagRetrievalService retrievalService;
    private final RagQueryRefinerService queryRefinerService;
    private final GeminiGenerationService generationService;
    private final MeterRegistry meterRegistry;

    private final int defaultTopK;
    private final double defaultSimilarityThreshold;
    private final double defaultTemperature;

    public RagSynthesisService(
            RagRetrievalService retrievalService,
            RagQueryRefinerService queryRefinerService,
            GeminiGenerationService generationService,
            MeterRegistry meterRegistry,
            @Value("${rag.top-k:5}") int defaultTopK,
            @Value("${rag.similarity-threshold:0.65}") double defaultSimilarityThreshold,
            @Value("${gemini.generation-temperature:0.1}") double defaultTemperature) {
        this.retrievalService = retrievalService;
        this.queryRefinerService = queryRefinerService;
        this.generationService = generationService;
        this.meterRegistry = meterRegistry;
        this.defaultTopK = defaultTopK;
        this.defaultSimilarityThreshold = defaultSimilarityThreshold;
        this.defaultTemperature = defaultTemperature;
    }

    /**
     * Executes the full RAG query-to-generation pipeline with quality gate validation and query refinement.
     *
     * @param request user query request parameters
     * @return RagQueryResponse with answer, citations, evidence, and latency metrics
     */
    public RagQueryResponse queryAndSynthesize(RagQueryRequest request) {
        long totalStartTime = System.currentTimeMillis();

        int topK = request.resolvedTopK(defaultTopK);
        double threshold = request.resolvedSimilarityThreshold(defaultSimilarityThreshold);
        double temperature = request.resolvedTemperature(defaultTemperature);

        // 1. Initial Candidate-Constrained Retrieval
        long retrievalStartTime = System.currentTimeMillis();
        RagRetrievalRequest retrievalReq = new RagRetrievalRequest(
                request.query(),
                request.clientId(),
                request.candidateIsins(),
                null,
                topK,
                threshold
        );

        RagRetrievalResponse retrievalResponse = retrievalService.retrieveEvidence(retrievalReq);
        long retrievalLatencyMs = System.currentTimeMillis() - retrievalStartTime;

        boolean queryWasRefined = false;

        // 2. Query Refinement Loop on Quality Gate Failure
        if (!retrievalResponse.isSufficient()) {
            log.info("Quality gate failed for query '{}'. Initiating query refinement loop...", request.query());
            RagQueryRefinerService.RefinedQueryResult refinedResult = queryRefinerService.refineQuery(request.query());

            if (refinedResult.wasRefined()) {
                queryWasRefined = true;
                RagRetrievalRequest retryReq = new RagRetrievalRequest(
                        refinedResult.refinedQuery(),
                        request.clientId(),
                        request.candidateIsins(),
                        null,
                        topK,
                        threshold
                );

                long retryStart = System.currentTimeMillis();
                RagRetrievalResponse retryResponse = retrievalService.retrieveEvidence(retryReq);
                retrievalLatencyMs += (System.currentTimeMillis() - retryStart);

                if (retryResponse.isSufficient() || retryResponse.ragSimilarityScore() > retrievalResponse.ragSimilarityScore()) {
                    log.info("Query refinement improved evidence relevance (score: {} -> {})",
                            retrievalResponse.ragSimilarityScore(), retryResponse.ragSimilarityScore());
                    retrievalResponse = retryResponse;
                }
            }
        }

        // 3. Defensive Degradation if Evidence Remains Insufficient
        if (!retrievalResponse.isSufficient() || retrievalResponse.evidenceChunks().isEmpty()) {
            Counter.builder("rag_synthesis_total")
                    .tag("grounded", "false")
                    .register(meterRegistry)
                    .increment();

            long totalLatency = System.currentTimeMillis() - totalStartTime;
            String defensiveAnswer = String.format(
                    "Based on official mutual fund regulatory disclosures, no verified document chunks met the required quality relevance threshold (%.2f) to answer your query reliably. The highest matching relevance was %.2f. To prevent ungrounded information, please refine your search or specify a particular fund scheme.",
                    threshold, retrievalResponse.ragSimilarityScore()
            );

            return new RagQueryResponse(
                    request.query(),
                    defensiveAnswer,
                    false,
                    queryWasRefined,
                    retrievalResponse.ragSimilarityScore(),
                    List.of(),
                    retrievalResponse.evidenceChunks(),
                    retrievalLatencyMs,
                    0,
                    totalLatency,
                    "Grounded synthesis bypassed: Evidence quality gate was not satisfied."
            );
        }

        // 4. Grounded Context Assembly
        String systemInstruction = """
            You are an expert SEBI-compliant Wealth Management Copilot for financial advisors.
            Your task is to answer the user's investment query using EXCLUSIVELY the provided Grounded Evidence.
            Rules:
            1. Every financial figure, expense ratio, asset allocation percentage, and risk evaluation MUST have an inline source citation tag matching its Source block (e.g. [Source 1], [Source 2]).
            2. NEVER extrapolate, assume, or invent statistics not explicitly stated in the evidence.
            3. If the evidence does not fully disclose an answer to a specific sub-question, explicitly state that official disclosures do not mention it.
            4. Keep the tone professional, objective, and compliant with financial advisory standards.
            """;

        String groundedPrompt = assembleGroundedPrompt(request.query(), retrievalResponse.evidenceChunks());

        // 5. LLM Synthesis via Gemini 2.0 Flash
        long synthesisStartTime = System.currentTimeMillis();
        Timer.Sample synthesisTimer = Timer.start(meterRegistry);

        String synthesizedAnswer = generationService.generateGroundedResponse(
                systemInstruction,
                groundedPrompt,
                temperature
        );

        long synthesisLatencyMs = System.currentTimeMillis() - synthesisStartTime;
        synthesisTimer.stop(Timer.builder("rag_synthesis_duration_seconds").register(meterRegistry));
        Counter.builder("rag_synthesis_total")
                .tag("grounded", "true")
                .register(meterRegistry)
                .increment();

        // 6. Format Citations List
        List<String> citations = extractCitations(retrievalResponse.evidenceChunks());
        long totalLatencyMs = System.currentTimeMillis() - totalStartTime;

        return new RagQueryResponse(
                request.query(),
                synthesizedAnswer,
                true,
                queryWasRefined,
                retrievalResponse.ragSimilarityScore(),
                citations,
                retrievalResponse.evidenceChunks(),
                retrievalLatencyMs,
                synthesisLatencyMs,
                totalLatencyMs,
                String.format("Successfully synthesized grounded answer backed by %d authentic disclosure sources.", citations.size())
        );
    }

    private String assembleGroundedPrompt(String userQuery, List<RetrievedEvidenceChunk> evidenceChunks) {
        StringBuilder sb = new StringBuilder();
        sb.append("### USER QUERY\n");
        sb.append(userQuery).append("\n\n");
        sb.append("### GROUNDED EVIDENCE (AUTHENTIC SEBI DISCLOSURE DOCUMENTS)\n");

        for (int i = 0; i < evidenceChunks.size(); i++) {
            RetrievedEvidenceChunk chunk = evidenceChunks.get(i);
            sb.append(String.format("[Source %d: %s | %s | ISIN: %s | Relevance: %.2f]\n",
                    i + 1,
                    chunk.fundName(),
                    chunk.documentType(),
                    chunk.isin(),
                    chunk.similarityScore() != null ? chunk.similarityScore() : 0.0
            ));
            sb.append(chunk.chunkText().trim()).append("\n\n");
        }

        sb.append("### INSTRUCTIONS\n");
        sb.append("Synthesize a comprehensive, factual answer citing the bracketed source tags (e.g. [Source 1]) for all facts.\n");

        return sb.toString();
    }

    private List<String> extractCitations(List<RetrievedEvidenceChunk> evidenceChunks) {
        List<String> citations = new ArrayList<>(evidenceChunks.size());
        for (int i = 0; i < evidenceChunks.size(); i++) {
            RetrievedEvidenceChunk chunk = evidenceChunks.get(i);
            citations.add(String.format("[Source %d] %s (%s, ISIN: %s)",
                    i + 1,
                    chunk.fundName(),
                    chunk.documentType(),
                    chunk.isin()
            ));
        }
        return citations;
    }
}
