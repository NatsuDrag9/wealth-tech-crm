package com.wealthtech.crm.modules.portfolioreview.service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wealthtech.crm.infrastructure.ai.GeminiGenerationService;
import com.wealthtech.crm.infrastructure.ai.security.PiiProtectionGateway;
import com.wealthtech.crm.infrastructure.ai.security.PiiTokenizationResult;
import com.wealthtech.crm.modules.customer.entity.Client;
import com.wealthtech.crm.modules.customer.entity.ClientProfile;
import com.wealthtech.crm.modules.customer.repository.ClientRepository;
import com.wealthtech.crm.modules.portfolioreview.dto.*;
import com.wealthtech.crm.modules.portfolioreview.entity.RagConversationTurn;
import com.wealthtech.crm.modules.portfolioreview.repository.RagConversationTurnRepository;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;

/**
 * Service orchestrating grounded RAG query synthesis:
 * 1. Executes bidirectional PII tokenization to protect client identity before LLM ingestion.
 * 2. Injects conversational history window (Approach A - Window Buffer Memory).
 * 3. Executes candidate-constrained retrieval.
 * 4. Evaluates the Evidence Quality Gate.
 * 5. Triggers automated query refinement on quality gate failures.
 * 6. Assembles grounded context with explicit source anchors and prior conversation turns.
 * 7. Synthesizes factual natural-language answers via Google Gemini.
 * 8. Rehydrates surrogate PII tokens into the final response before delivery.
 * 9. Persists conversation turns for multi-turn dialogue continuity.
 * 10. Records granular end-to-end latency breakdowns.
 */
@Service
@Slf4j
public class RagSynthesisService {

    private final RagRetrievalService retrievalService;
    private final RagQueryRefinerService queryRefinerService;
    private final GeminiGenerationService generationService;
    private final PiiProtectionGateway piiProtectionGateway;
    private final ClientRepository clientRepository;
    private final RagConversationTurnRepository turnRepository;
    private final MeterRegistry meterRegistry;

    private final int defaultTopK;
    private final double defaultSimilarityThreshold;
    private final double defaultTemperature;
    private final int maxHistoryTurns;

    public RagSynthesisService(
            RagRetrievalService retrievalService,
            RagQueryRefinerService queryRefinerService,
            GeminiGenerationService generationService,
            PiiProtectionGateway piiProtectionGateway,
            ClientRepository clientRepository,
            RagConversationTurnRepository turnRepository,
            MeterRegistry meterRegistry,
            @Value("${rag.top-k:5}") int defaultTopK,
            @Value("${rag.similarity-threshold:0.65}") double defaultSimilarityThreshold,
            @Value("${gemini.generation-temperature:0.1}") double defaultTemperature,
            @Value("${rag.conversation.max-history-turns:3}") int maxHistoryTurns) {
        this.retrievalService = retrievalService;
        this.queryRefinerService = queryRefinerService;
        this.generationService = generationService;
        this.piiProtectionGateway = piiProtectionGateway;
        this.clientRepository = clientRepository;
        this.turnRepository = turnRepository;
        this.meterRegistry = meterRegistry;
        this.defaultTopK = defaultTopK;
        this.defaultSimilarityThreshold = defaultSimilarityThreshold;
        this.defaultTemperature = defaultTemperature;
        this.maxHistoryTurns = maxHistoryTurns;
    }

    /**
     * Executes the full RAG query-to-generation pipeline with quality gate validation and query refinement.
     *
     * @param request user query request parameters
     * @return RagQueryResponse with answer, citations, evidence, and latency metrics
     */
    @Transactional
    public RagQueryResponse queryAndSynthesize(RagQueryRequest request) {
        long totalStartTime = System.currentTimeMillis();

        int topK = request.resolvedTopK(defaultTopK);
        double threshold = request.resolvedSimilarityThreshold(defaultSimilarityThreshold);
        double temperature = request.resolvedTemperature(defaultTemperature);

        // 0. Resolve Conversation Session & Fetch Prior History Window (Approach A)
        String conversationId = (request.conversationId() != null && !request.conversationId().isBlank())
                ? request.conversationId().trim()
                : UUID.randomUUID().toString();

        List<RagConversationTurn> priorTurns = (turnRepository != null)
                ? turnRepository.findByConversationIdOrderByTurnIndexAsc(conversationId)
                : List.of();

        // Keep last N turns within the configured window buffer
        List<RagConversationTurn> historyWindow = (priorTurns.size() > maxHistoryTurns)
                ? priorTurns.subList(priorTurns.size() - maxHistoryTurns, priorTurns.size())
                : priorTurns;

        Integer maxTurn = (turnRepository != null) ? turnRepository.findMaxTurnIndexByConversationId(conversationId) : null;
        int nextTurnIndex = (maxTurn != null) ? maxTurn + 1 : 1;

        // 1. Forward Pass: Bidirectional PII Minimization & Tokenization
        Client client = (request.clientId() != null)
                ? clientRepository.findByIdWithRelations(request.clientId()).orElse(null)
                : null;
        ClientProfile profile = (client != null) ? client.getProfile() : null;

        PiiTokenizationResult tokenizedQuery = piiProtectionGateway.tokenize(request.query(), client, profile);

        // 2. Initial Candidate-Constrained Retrieval
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

        // 3. Query Refinement Loop on Quality Gate Failure
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

        // 4. Defensive Degradation if Evidence Remains Insufficient
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

            persistTurn(conversationId, nextTurnIndex, request.query(), defensiveAnswer, false, request.clientId());

            return new RagQueryResponse(
                    request.query(),
                    conversationId,
                    nextTurnIndex,
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

        // 5. Grounded Context Assembly (Evidence + Window Buffer Conversation History)
        String systemInstruction = """
            You are an expert SEBI-compliant Wealth Management Copilot for financial advisors.
            Your task is to answer the user's investment query using EXCLUSIVELY the provided Grounded Evidence.
            Rules:
            1. Every financial figure, expense ratio, asset allocation percentage, and risk evaluation MUST have an inline source citation tag matching its Source block (e.g. [Source 1], [Source 2]).
            2. NEVER extrapolate, assume, or invent statistics not explicitly stated in the evidence.
            3. If the evidence does not fully disclose an answer to a specific sub-question, explicitly state that official disclosures do not mention it.
            4. Keep the tone professional, objective, and compliant with financial advisory standards.
            5. When conversation history is provided, use it to resolve contextual follow-up references accurately.
            """;

        String groundedPrompt = assembleGroundedPrompt(
                tokenizedQuery.sanitizedText(),
                retrievalResponse.evidenceChunks(),
                historyWindow
        );

        // 6. LLM Synthesis via Gemini (with automatic model cascading on 429)
        long synthesisStartTime = System.currentTimeMillis();
        Timer.Sample synthesisTimer = Timer.start(meterRegistry);

        String synthesizedAnswer = generationService.generateGroundedResponse(
                systemInstruction,
                groundedPrompt,
                temperature
        );

        long synthesisLatencyMs = System.currentTimeMillis() - synthesisStartTime;
        synthesisTimer.stop(Timer.builder("rag_synthesis_duration_seconds").register(meterRegistry));

        // 7. Check for Graceful Unavailable Sentinel vs Grounded Answer
        boolean isGrounded = !GeminiGenerationService.isSynthesisUnavailable(synthesizedAnswer);
        Counter.builder("rag_synthesis_total")
                .tag("grounded", String.valueOf(isGrounded))
                .register(meterRegistry)
                .increment();

        // 8. Backward Pass: De-tokenization / Re-hydration
        String rehydratedAnswer = tokenizedQuery.rehydrate(synthesizedAnswer);

        // 9. Persist Dialogue Turn for Multi-Turn Context (Approach A)
        persistTurn(conversationId, nextTurnIndex, request.query(), rehydratedAnswer, isGrounded, request.clientId());

        // 10. Format Citations List
        List<String> citations = extractCitations(retrievalResponse.evidenceChunks());
        long totalLatencyMs = System.currentTimeMillis() - totalStartTime;

        String statusMessage = isGrounded
                ? String.format("Successfully synthesized grounded answer backed by %d authentic disclosure sources.", citations.size())
                : "AI generation capacity reached; authentic disclosure evidence provided for manual review.";

        return new RagQueryResponse(
                request.query(),
                conversationId,
                nextTurnIndex,
                rehydratedAnswer,
                isGrounded,
                queryWasRefined,
                retrievalResponse.ragSimilarityScore(),
                citations,
                retrievalResponse.evidenceChunks(),
                retrievalLatencyMs,
                synthesisLatencyMs,
                totalLatencyMs,
                statusMessage
        );
    }

    private void persistTurn(String conversationId, int turnIndex, String query, String answer, boolean isGrounded, Long clientId) {
        if (turnRepository != null) {
            try {
                RagConversationTurn turn = RagConversationTurn.builder()
                        .conversationId(conversationId)
                        .turnIndex(turnIndex)
                        .userQuery(query)
                        .synthesizedAnswer(answer)
                        .isGrounded(isGrounded)
                        .clientId(clientId)
                        .build();
                turnRepository.save(turn);
            } catch (Exception e) {
                log.warn("Failed to persist conversation turn for conversationId '{}': {}", conversationId, e.getMessage());
            }
        }
    }

    private String assembleGroundedPrompt(
            String userQuery,
            List<RetrievedEvidenceChunk> evidenceChunks,
            List<RagConversationTurn> historyWindow) {

        StringBuilder sb = new StringBuilder();

        // Inject prior conversation turns (Approach A: Window Buffer Memory)
        if (historyWindow != null && !historyWindow.isEmpty()) {
            sb.append("### PRIOR CONVERSATION HISTORY\n");
            for (RagConversationTurn turn : historyWindow) {
                sb.append(String.format("User: %s\nAdvisor Copilot: %s\n\n",
                        turn.getUserQuery().trim(),
                        turn.getSynthesizedAnswer().trim()
                ));
            }
        }

        sb.append("### CURRENT USER QUERY\n");
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
