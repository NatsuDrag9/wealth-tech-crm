package com.wealthtech.crm.modules.portfolioreview.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PortfolioReviewResponse(
    Long id,
    @JsonProperty("client_id") Long clientId,
    String status,
    @JsonProperty("total_invested") BigDecimal totalInvested,
    @JsonProperty("total_current_value") BigDecimal totalCurrentValue,
    @JsonProperty("total_gain") BigDecimal totalGain,
    @JsonProperty("gain_percentage") Double gainPercentage,
    Double cagr,
    String note,
    List<PortfolioEntryResponse> entries,
    @JsonProperty("created_at") LocalDateTime createdAt
) {}
