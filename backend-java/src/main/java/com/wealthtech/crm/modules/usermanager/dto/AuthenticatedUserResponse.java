package com.wealthtech.crm.modules.usermanager.dto;

import com.wealthtech.crm.common.dto.DropdownOption;

import java.util.Set;

public record AuthenticatedUserResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String fullName,
        DropdownOption<Long> role,
        DropdownOption<Long> group,
        DropdownOption<Long> reportsTo,
        Set<String> permissions
) {
}
