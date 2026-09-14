package com.wealthtech.crm.modules.portfolioreview.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PortfolioRecommendationResponse(
    Long id,
    @JsonProperty("client_id") Long clientId,
    @JsonProperty("portfolio_review_id") Long portfolioReviewId,
    @JsonProperty("flow_type") String flowType,
    String status,
    @JsonProperty("investor_category") String investorCategory,
    @JsonProperty("generated_document_url") String generatedDocumentUrl,
    @JsonProperty("document_s3_key") String documentS3Key,
    List<RfItemResponse> funds,
    @JsonProperty("created_at") LocalDateTime createdAt
) {}
