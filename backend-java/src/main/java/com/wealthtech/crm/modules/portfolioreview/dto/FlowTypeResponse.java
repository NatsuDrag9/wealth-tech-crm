package com.wealthtech.crm.modules.portfolioreview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record FlowTypeResponse(
    String value,
    @JsonProperty("display_name") String displayName
) {}
