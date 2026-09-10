package com.wealthtech.crm.modules.customer.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record BulkUploadResponse(
        String status,
        String message,
        @JsonProperty("filename") String filename
) {
}
