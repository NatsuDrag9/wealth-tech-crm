package com.wealthtech.crm.modules.riskappetite.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotNull;

public record SubmitAnswerRequest(
        @NotNull(message = "Question ID is required") @JsonProperty("question_id") Long questionId,
        @NotNull(message = "Option ID is required") @JsonProperty("option_id") Long optionId) {

}
