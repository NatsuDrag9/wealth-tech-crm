package com.wealthtech.crm.modules.customer.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.wealthtech.crm.common.dto.DropdownOption;

public record ClientResponse(
        Long id,
        @JsonProperty("first_name") String firstName,
        @JsonProperty("last_name") String lastName,
        @JsonProperty("full_name") String fullName,
        String email,
        String phone,
        String pan,
        @JsonProperty("date_of_birth") LocalDate dateOfBirth,
        String gender,
        String status,
        @JsonProperty("kyc_status") String kycStatus,
        @JsonProperty("relationship_manager") DropdownOption<Long> relationshipManager,
        @JsonProperty("sign_up_date") LocalDate signUpDate,
        @JsonProperty("created_at") LocalDateTime createdAt
) {
}
