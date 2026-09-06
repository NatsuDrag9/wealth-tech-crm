package com.wealthtech.crm.modules.usermanager.dto;

public record PermissionResponse(
        Long id,
        String codename,
        String name,
        String contentType
) {
}
