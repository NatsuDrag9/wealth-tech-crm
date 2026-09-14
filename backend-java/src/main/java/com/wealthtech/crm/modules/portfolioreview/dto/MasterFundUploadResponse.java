package com.wealthtech.crm.modules.portfolioreview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record MasterFundUploadResponse(
        String status,
        String message,
        String filename,
        @JsonProperty("s3_key") String s3Key,
        @JsonProperty("file_url") String fileUrl,
        @JsonProperty("total_records") int totalRecords,
        @JsonProperty("inserted_records") int insertedRecords,
        @JsonProperty("updated_records") int updatedRecords
) {}
