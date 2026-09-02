package com.wealthtech.crm.modules.auth.controller;

import com.wealthtech.crm.modules.auth.dto.AuthResponse;
import com.wealthtech.crm.modules.auth.dto.LoginDto;
import com.wealthtech.crm.modules.auth.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // 1. Login Endpoint
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginDto loginDto, // request body

            HttpServletResponse response // Spring-provided HTTP response
    ) {
        AuthResponse authResponse = authService.login(loginDto, response); // ← AuthResponse returned with new JWT token and metadata
        return ResponseEntity.ok(authResponse);
    }

    // 2. Refresh Token Endpoint
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(
            @CookieValue(name = "refreshToken") String refreshToken
    ) {
        AuthResponse response = authService.refreshAccessToken(refreshToken);
        return ResponseEntity.ok(response);
    }

    // 3. Logout Endpoint
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        authService.logout(response);
        return ResponseEntity.ok().build();
    }
}
