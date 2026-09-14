package com.wealthtech.crm.modules.customer.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record BulkUploadResponse(
        String status,
        String message,
        @JsonProperty("filename") String filename,
        @JsonProperty("s3_key") String s3Key,
        @JsonProperty("file_url") String fileUrl
) {
    public BulkUploadResponse(String status, String message, String filename) {
        this(status, message, filename, null, null);
    }
}
