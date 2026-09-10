package com.wealthtech.crm.modules.customer.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ClientProfileResponse(
        Long id,
        @JsonProperty("client_id") Long clientId,
        @JsonProperty("kyc_status") String kycStatus,
        @JsonProperty("client_status") String clientStatus,
        @JsonProperty("address_line") String addressLine,
        String city,
        String state,
        String pincode,
        String country,
        @JsonProperty("created_at") LocalDateTime createdAt,
        @JsonProperty("updated_at") LocalDateTime updatedAt
) {
}
