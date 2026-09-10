package com.wealthtech.crm.modules.customer.dto;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.wealthtech.crm.modules.customer.enums.Gender;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateClientRequest(
        @NotBlank(message = "First name is required")
        @JsonProperty("first_name")
        String firstName,

        @NotBlank(message = "Last name is required")
        @JsonProperty("last_name")
        String lastName,

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        @JsonProperty("email")
        String email,

        @NotBlank(message = "Phone is required")
        @JsonProperty("phone")
        String phone,

        @NotBlank(message = "Pan is required")
        @JsonProperty("pan")
        String pan,

        @NotNull(message = "Date of birth is required")
        @JsonProperty("date_of_birth")
        LocalDate dateOfBirth,

        @JsonProperty("gender")
        Gender gender,

        @JsonProperty("relationship_manager_id")
        Long relationshipManagerId,

        @JsonProperty("address_line")
        String addressLine,

        @JsonProperty("city")
        String city,

        @JsonProperty("state")
        String state,

        @JsonProperty("pincode")
        String pincode,

        @JsonProperty("country")
        String country
) {
}
