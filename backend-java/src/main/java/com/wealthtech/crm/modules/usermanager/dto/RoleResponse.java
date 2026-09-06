package com.wealthtech.crm.modules.usermanager.dto;

import com.wealthtech.crm.common.dto.DropdownOption;

import java.time.LocalDateTime;
import java.util.Set;

public record RoleResponse(
        Long id,
        String name,
        String description,
        DropdownOption<Long> group,
        Set<String> permissions,
        LocalDateTime createdAt,
        DropdownOption<Long> createdBy,
        LocalDateTime updatedAt,
        DropdownOption<Long> updatedBy
) {
}
