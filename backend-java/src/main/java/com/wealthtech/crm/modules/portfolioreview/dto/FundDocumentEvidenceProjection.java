package com.wealthtech.crm.modules.portfolioreview.dto;

import java.time.LocalDateTime;

/**
 * Spring Data JPA projection for candidate-constrained hybrid retrieval results.
 * Returns the matching document chunk metadata alongside the computed hybrid relevance score.
 */
public interface FundDocumentEvidenceProjection {
    Long getId();
    String getIsin();
    String getFundName();
    String getDocumentType();
    String getScoreCategory();
    String getAssetClass();
    Integer getChunkIndex();
    String getChunkText();
    String getMetadata();
    Double getHybridScore();
    LocalDateTime getCreatedAt();
}
