package com.wealthtech.crm.modules.customer.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotNull;

public record UpdateClientRmRequest(
        @NotNull(message = "Relationship manager ID is required")
        @JsonProperty("relationship_manager_id")
        Long rmId
) {
}
