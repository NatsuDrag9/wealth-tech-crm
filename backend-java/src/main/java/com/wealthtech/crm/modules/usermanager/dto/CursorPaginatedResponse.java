package com.wealthtech.crm.modules.usermanager.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record CursorPaginatedResponse<T>(
        List<T> results,
        String next,
        String previous,
        @JsonProperty("page_number") Integer pageNumber,
        @JsonProperty("total_pages") Integer totalPages,
        @JsonProperty("total_size") Long totalSize
) {
}
