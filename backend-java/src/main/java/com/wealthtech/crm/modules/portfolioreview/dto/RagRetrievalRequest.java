package com.wealthtech.crm.modules.portfolioreview.dto;

import java.util.List;

import com.wealthtech.crm.modules.portfolioreview.enums.DocumentType;

import jakarta.validation.constraints.NotBlank;

public record RagRetrievalRequest(
        @NotBlank(message = "Search query must not be blank")
        String query,

        Long clientId,                 // Optional: automatically infers candidateIsins from client's risk profile
        List<String> candidateIsins,   // Optional: explicit list of allowed ISINs
        DocumentType documentType,     // Optional: filter by FACTSHEET, SID, etc.
        Integer topK,                  // Default: 5
        Double similarityThreshold     // Default: 0.65
) {
    public int resolvedTopK() {
        return (topK != null && topK > 0) ? Math.min(topK, 20) : 5;
    }

    public double resolvedSimilarityThreshold() {
        return (similarityThreshold != null && similarityThreshold > 0) ? similarityThreshold : 0.65;
    }
}
