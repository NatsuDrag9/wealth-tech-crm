package com.wealthtech.crm.modules.portfolioreview.service;

import java.util.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wealthtech.crm.infrastructure.ai.GeminiEmbeddingService;
import com.wealthtech.crm.modules.portfolioreview.dto.*;
import com.wealthtech.crm.modules.portfolioreview.entity.EligibleFund;
import com.wealthtech.crm.modules.portfolioreview.repository.EligibleFundRepository;
import com.wealthtech.crm.modules.portfolioreview.repository.FundDocumentEmbeddingRepository;
import com.wealthtech.crm.modules.riskappetite.entity.RiskAssessment;
import com.wealthtech.crm.modules.riskappetite.enums.AssessmentStatus;
import com.wealthtech.crm.modules.riskappetite.repository.RaRepository;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for candidate-constrained hybrid RAG retrieval and post-retrieval quality validation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RagRetrievalService {

    private final FundDocumentEmbeddingRepository embeddingRepository;
    private final EligibleFundRepository eligibleFundRepository;
    private final RaRepository raRepository;
    private final GeminiEmbeddingService embeddingService;
    private final MeterRegistry meterRegistry;

    /**
     * Executes candidate-constrained retrieval with post-retrieval quality gate validation.
     */
    @Transactional(readOnly = true)
    public RagRetrievalResponse retrieveEvidence(RagRetrievalRequest request) {
        long startTime = System.currentTimeMillis();
        Timer.Sample sample = Timer.start(meterRegistry);

        // 1. Resolve Candidate ISINs (Deterministic Filtering)
        List<String> candidateIsins = resolveCandidateIsins(request);
        if (candidateIsins.isEmpty()) {
            log.warn("Candidate ISIN filter produced zero eligible funds for request query: {}", request.query());
            return new RagRetrievalResponse(
                    request.query(),
                    false,
                    0.0,
                    0.0,
                    Collections.emptyList(),
                    Collections.emptyList(),
                    System.currentTimeMillis() - startTime,
                    "No eligible candidate mutual funds found matching client risk profile or criteria."
            );
        }

        // 2. Generate Dense Embedding Vector for Query
        float[] queryVector = embeddingService.getEmbedding(request.query());
        String vectorString = formatVectorForPostgres(queryVector);

        // 3. Query PostgreSQL pgvector Hybrid Retrieval
        int topK = request.resolvedTopK();
        List<FundDocumentEvidenceProjection> projections = embeddingRepository.findTopKRelevantEvidence(
                candidateIsins,
                vectorString,
                request.query(),
                topK
        );

        long latency = System.currentTimeMillis() - startTime;
        sample.stop(Timer.builder("rag_retrieval_duration_seconds").register(meterRegistry));

        // 4. Post-Retrieval Validation (Evidence Quality Gate)
        return evaluateQualityGate(request, projections, candidateIsins, latency);
    }

    private List<String> resolveCandidateIsins(RagRetrievalRequest request) {
        if (request.candidateIsins() != null && !request.candidateIsins().isEmpty()) {
            return request.candidateIsins();
        }

        // Infer candidate funds from client's risk assessment profile
        if (request.clientId() != null) {
            Optional<RiskAssessment> assessmentOpt = raRepository.findTopByClientIdAndStatusOrderByCompletedAtDesc(
                    request.clientId(),
                    AssessmentStatus.COMPLETED
            );

            if (assessmentOpt.isPresent()) {
                RiskAssessment assessment = assessmentOpt.get();
                List<EligibleFund> funds = eligibleFundRepository.findByScoreCategoryAndIsActiveTrue(assessment.getScoreCategory());
                log.info("Resolved {} candidate funds for client {} with risk category {}",
                        funds.size(), request.clientId(), assessment.getScoreCategory());
                return funds.stream().map(EligibleFund::getIsin).toList();
            }
        }

        // Fallback: all active funds in master list
        return eligibleFundRepository.findAll().stream()
                .filter(EligibleFund::getIsActive)
                .map(EligibleFund::getIsin)
                .toList();
    }

    private RagRetrievalResponse evaluateQualityGate(
            RagRetrievalRequest request,
            List<FundDocumentEvidenceProjection> projections,
            List<String> candidateIsins,
            long latencyMs) {

        if (projections.isEmpty()) {
            Counter.builder("rag_quality_gate_evaluations_total")
                    .tag("verdict", "fail")
                    .register(meterRegistry)
                    .increment();

            return new RagRetrievalResponse(
                    request.query(),
                    false,
                    0.0,
                    0.0,
                    candidateIsins,
                    Collections.emptyList(),
                    latencyMs,
                    "Zero document chunks found matching the candidate fund constraints."
            );
        }

        double maxScore = projections.stream()
                .mapToDouble(p -> p.getHybridScore() != null ? p.getHybridScore() : 0.0)
                .max()
                .orElse(0.0);

        meterRegistry.summary("rag_similarity_score").record(maxScore);

        double threshold = request.resolvedSimilarityThreshold();
        boolean isSufficient = maxScore >= threshold;

        // Evidence consistency: % of retrieved chunks matching expected candidate ISINs
        long consistentCount = projections.stream()
                .filter(p -> candidateIsins.contains(p.getIsin()))
                .count();
        double consistencyScore = (double) consistentCount / projections.size();

        if (isSufficient) {
            Counter.builder("rag_quality_gate_evaluations_total")
                    .tag("verdict", "pass")
                    .register(meterRegistry)
                    .increment();
        } else {
            Counter.builder("rag_quality_gate_evaluations_total")
                    .tag("verdict", "fail")
                    .register(meterRegistry)
                    .increment();
            log.warn("Evidence quality gate failed: max hybrid score {} below threshold {}", maxScore, threshold);
        }

        List<RetrievedEvidenceChunk> evidenceChunks = projections.stream()
                .map(p -> new RetrievedEvidenceChunk(
                        p.getId(),
                        p.getIsin(),
                        p.getFundName(),
                        p.getDocumentType(),
                        p.getScoreCategory(),
                        p.getAssetClass(),
                        p.getChunkIndex(),
                        p.getChunkText(),
                        p.getHybridScore(),
                        p.getMetadata(),
                        p.getCreatedAt()
                ))
                .toList();

        String message = isSufficient
                ? String.format("Successfully retrieved %d relevant chunks passing quality threshold (%.2f).", evidenceChunks.size(), threshold)
                : String.format("Retrieved chunks fell below the quality relevance threshold (max score: %.2f, required: %.2f).", maxScore, threshold);

        return new RagRetrievalResponse(
                request.query(),
                isSufficient,
                maxScore,
                consistencyScore,
                candidateIsins,
                evidenceChunks,
                latencyMs,
                message
        );
    }

    private String formatVectorForPostgres(float[] vector) {
        StringBuilder sb = new StringBuilder(vector.length * 8 + 2);
        sb.append('[');
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(vector[i]);
        }
        sb.append(']');
        return sb.toString();
    }
}
