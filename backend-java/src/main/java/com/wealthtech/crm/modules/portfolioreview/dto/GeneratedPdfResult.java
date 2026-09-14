package com.wealthtech.crm.modules.portfolioreview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record GeneratedPdfResult(
    @JsonProperty("s3_key") String s3Key,
    @JsonProperty("presigned_url") String presignedUrl
) {}
