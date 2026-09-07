package com.wealthtech.crm.modules.usermanager.dto;

public record PermissionResponse(
        Long id,
        String name,
        String displayName,
        String resource
) {
}
