package com.wealthtech.crm.modules.portfolioreview.dto;

import java.util.List;

public record RagRetrievalResponse(
        String query,
        boolean isSufficient,
        Double ragSimilarityScore,
        Double evidenceConsistencyScore,
        List<String> candidateIsinsUsed,
        List<RetrievedEvidenceChunk> evidenceChunks,
        long latencyMs,
        String message
) {}
