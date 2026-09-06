package com.wealthtech.crm.modules.usermanager.dto;

public record PaginatedResponse<T>(
        List<T> results,
        String next,
        String previous,
        Integer pageNumber,
        Integer totalPages,
        Long totalSize
) {
}
