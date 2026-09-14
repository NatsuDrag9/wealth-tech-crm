package com.wealthtech.crm.modules.portfolioreview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Response returned after uploading an eCAS electronic statement to AWS S3.
 * Contains the S3 object key and a temporary pre-signed URL for direct download.
 */
public record EcasUploadResponse(
        String status,
        String message,
        @JsonProperty("client_id") Long clientId,
        String filename,
        @JsonProperty("s3_key") String s3Key,
        @JsonProperty("file_url") String fileUrl
) {}
