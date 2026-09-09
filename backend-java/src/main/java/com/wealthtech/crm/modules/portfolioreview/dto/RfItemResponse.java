package com.wealthtech.crm.modules.portfolioreview.dto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonProperty;

public record RfItemResponse(
    Long id,
    EligibleFundResponse fund,
    BigDecimal amount,
    @JsonProperty("replaces_entry_id") Long replacesEntryId,
    @JsonProperty("display_order") Integer displayOrder
) {}
