package com.wealthtech.crm.modules.usermanager.dto;

import com.wealthtech.crm.common.dto.DropdownOption;

import java.time.LocalDateTime;

public record GroupResponse(
        Long id,
        String name,
        String description,
        LocalDateTime createdAt,
        DropdownOption<Long> createdBy,
        LocalDateTime updatedAt,
        DropdownOption<Long> updatedBy
) {
}
