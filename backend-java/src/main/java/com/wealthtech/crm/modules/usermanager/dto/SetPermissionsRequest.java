package com.wealthtech.crm.modules.usermanager.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SetPermissionsRequest(
        @NotNull(message = "Permission IDs are required")
        @Size(min = 0, message = "Permission IDs must not be null")
        List<Long> permissionIds
) {
}
