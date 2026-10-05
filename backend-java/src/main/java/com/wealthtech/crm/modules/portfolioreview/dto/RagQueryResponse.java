package com.wealthtech.crm.modules.portfolioreview.dto;

import java.util.List;

public record RagQueryResponse(
        String query,
        String synthesizedAnswer,
        boolean isGrounded,
        boolean queryRefined,
        Double similarityScore,
        List<String> citations,
        List<RetrievedEvidenceChunk> evidenceChunks,
        long retrievalLatencyMs,
        long synthesisLatencyMs,
        long totalLatencyMs,
        String message
) {}
