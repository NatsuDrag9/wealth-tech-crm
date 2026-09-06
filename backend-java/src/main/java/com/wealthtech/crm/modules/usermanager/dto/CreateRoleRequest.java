package com.wealthtech.crm.modules.usermanager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateRoleRequest(
        @NotNull(message = "Group ID is required")
        Long groupId,

        @NotBlank(message = "Role name is required")
        String name,

        String description
) {
}
