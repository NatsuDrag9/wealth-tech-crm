package com.wealthtech.crm.modules.usermanager.dto;

import jakarta.validation.constraints.Email;

import java.util.List;

public record UpdateUserRequest(
        @Email(message = "Must be a valid email address")
        String email,

        String firstName,
        String lastName,
        Long roleId,
        Long groupId,
        Long reportsToId,
        List<String> languages
) {
}
