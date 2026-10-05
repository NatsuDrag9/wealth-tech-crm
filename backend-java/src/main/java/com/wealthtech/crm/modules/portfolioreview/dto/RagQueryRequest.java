package com.wealthtech.crm.modules.portfolioreview.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;

public record RagQueryRequest(
        @NotBlank(message = "Query text is required")
        String query,

        Long clientId,
        List<String> candidateIsins,
        Integer topK,
        Double similarityThreshold,
        Double temperature
) {
    public int resolvedTopK(int defaultTopK) {
        return (topK != null && topK > 0) ? Math.min(topK, 20) : defaultTopK;
    }

    public double resolvedSimilarityThreshold(double defaultThreshold) {
        return (similarityThreshold != null && similarityThreshold > 0) ? similarityThreshold : defaultThreshold;
    }

    public double resolvedTemperature(double defaultTemp) {
        return (temperature != null && temperature >= 0.0 && temperature <= 1.0) ? temperature : defaultTemp;
    }
}
