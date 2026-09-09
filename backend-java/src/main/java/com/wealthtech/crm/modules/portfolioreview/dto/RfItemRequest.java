package com.wealthtech.crm.modules.portfolioreview.dto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record RfItemRequest(
    @NotNull @JsonProperty("eligible_fund_id") Long eligibleFundId,
    @NotNull @DecimalMin("1.0") BigDecimal amount,
    @JsonProperty("replaces_entry_id") Long replacesEntryId,
    @JsonProperty("display_order") Integer displayOrder
) {}
