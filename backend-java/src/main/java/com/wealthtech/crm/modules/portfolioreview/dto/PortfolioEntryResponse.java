package com.wealthtech.crm.modules.portfolioreview.dto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PortfolioEntryResponse(
    Long id,
    @JsonProperty("fund_name") String fundName,
    String isin,
    BigDecimal units,
    @JsonProperty("purchase_nav") BigDecimal purchaseNav,
    @JsonProperty("current_nav") BigDecimal currentNav,
    @JsonProperty("invested_amount") BigDecimal investedAmount,
    @JsonProperty("current_value") BigDecimal currentValue,
    @JsonProperty("abs_return_pct") Double absReturnPct,
    BigDecimal gain,
    @JsonProperty("cagr_pct") Double cagrPct,
    @JsonProperty("holding_days") Integer holdingDays,
    String action
) {}
