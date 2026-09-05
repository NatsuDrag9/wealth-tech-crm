package com.wealthtech.crm.modules.usermanager.dto;

import com.wealthtech.crm.common.dto.DropdownOption;

import java.time.LocalDateTime;
import java.util.List;

public record UserResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String fullName,
        DropdownOption<Long> role,
        DropdownOption<Long> group,
        DropdownOption<Long> reportsTo,
        LocalDateTime createdAt,
        Long createdBy,
        List<String> languages
) {
}
