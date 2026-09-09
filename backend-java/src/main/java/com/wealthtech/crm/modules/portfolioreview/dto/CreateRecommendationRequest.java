package com.wealthtech.crm.modules.portfolioreview.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record CreateRecommendationRequest(
    @NotNull @JsonProperty("client_id") Long clientId,
    @JsonProperty("portfolio_review_id") Long portfolioReviewId,
    @NotBlank @JsonProperty("flow_type") String flowType,
    @NotEmpty List<@Valid RfItemRequest> funds
) {}
