package com.wealthtech.crm.modules.customer.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.wealthtech.crm.modules.customer.enums.ClientStatus;

import jakarta.validation.constraints.NotNull;

public record UpdateClientStatusRequest(
        @NotNull(message = "Status is required")
        @JsonProperty("status")
        ClientStatus status
) {
}
