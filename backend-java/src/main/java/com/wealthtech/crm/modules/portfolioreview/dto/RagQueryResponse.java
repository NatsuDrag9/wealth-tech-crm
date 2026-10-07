package com.wealthtech.crm.modules.portfolioreview.dto;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;

public record RagQueryResponse(
        String query,
        @JsonProperty("conversation_id")
        String conversationId,
        @JsonProperty("turn_index")
        Integer turnIndex,
        @JsonProperty("synthesized_answer")
        String synthesizedAnswer,
        @JsonProperty("is_grounded")
        boolean isGrounded,
        @JsonProperty("query_refined")
        boolean queryRefined,
        @JsonProperty("similarity_score")
        Double similarityScore,
        List<String> citations,
        @JsonProperty("evidence_chunks")
        List<RetrievedEvidenceChunk> evidenceChunks,
        @JsonProperty("retrieval_latency_ms")
        long retrievalLatencyMs,
        @JsonProperty("synthesis_latency_ms")
        long synthesisLatencyMs,
        @JsonProperty("total_latency_ms")
        long totalLatencyMs,
        String message
) {
    @JsonProperty("answer")
    public String getAnswer() {
        return synthesizedAnswer;
    }
}

