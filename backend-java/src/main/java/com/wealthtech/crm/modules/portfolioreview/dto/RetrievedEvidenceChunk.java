package com.wealthtech.crm.modules.portfolioreview.dto;

import java.time.LocalDateTime;

public record RetrievedEvidenceChunk(
        Long id,
        String isin,
        String fundName,
        String documentType,
        String scoreCategory,
        String assetClass,
        Integer chunkIndex,
        String chunkText,
        Double similarityScore,
        String metadata,
        LocalDateTime createdAt
) {}
