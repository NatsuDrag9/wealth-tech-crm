package com.wealthtech.crm.modules.customer.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.wealthtech.crm.modules.customer.enums.KycStatus;

import jakarta.validation.constraints.NotNull;

public record VerifyKycRequest(
        @NotNull(message = "KYC status is required (VERIFIED or REJECTED)")
        @JsonProperty("kyc_status")
        KycStatus kycStatus
) {
}
