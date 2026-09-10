package com.wealthtech.crm.modules.customer.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record BulkReassignRmRequest(
        @NotEmpty(message = "Client IDs list cannot be empty")
        @JsonProperty("client_ids")
        List<Long> clientIds,

        @NotNull(message = "New Relationship Manager ID is required")
        @JsonProperty("new_rm_id")
        Long newRmId
) {
}
