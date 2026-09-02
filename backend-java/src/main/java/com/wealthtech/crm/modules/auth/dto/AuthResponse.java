package com.wealthtech.crm.modules.auth.dto;

import java.util.Set;

public record AuthResponse(
        String accessToken,
        String tokenType,
        String message,
        String email,
        String role,
        Set<String> permissions
) {
    // Convenience constructor with default "Bearer" tokenType
    public AuthResponse(String accessToken, String message, String email, String role, Set<String> permissions) {
        this(accessToken, "Bearer", message, email, role, permissions);
    }
}
