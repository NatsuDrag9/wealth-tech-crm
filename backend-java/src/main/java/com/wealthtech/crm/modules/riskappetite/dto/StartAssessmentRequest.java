package com.wealthtech.crm.modules.riskappetite.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotNull;

public record StartAssessmentRequest(
        @NotNull(message = "client id is required") @JsonProperty("client_id") Long clientId) {

}
