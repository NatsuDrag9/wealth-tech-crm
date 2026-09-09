package com.wealthtech.crm.modules.portfolioreview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record EligibleFundResponse(
    Long id,
    @JsonProperty("fund_name") String fundName,
    String isin,
    @JsonProperty("fund_subcategory") String fundSubCategory,
    @JsonProperty("asset_class") String assetClass,
    @JsonProperty("instrument_type") String instrumentType,
    @JsonProperty("score_category") String scoreCategory
) {}
