package com.wealthtech.crm.modules.auth.service;

import com.wealthtech.crm.modules.auth.dto.AuthResponse;
import com.wealthtech.crm.modules.auth.dto.LoginDto;
import com.wealthtech.crm.modules.usermanager.entity.Permission;
import com.wealthtech.crm.modules.usermanager.entity.User;
import com.wealthtech.crm.modules.usermanager.repository.UserRepository;
import com.wealthtech.crm.security.JwtTokenProvider;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    public AuthResponse login(LoginDto loginDto, HttpServletResponse response) {
        // 1. Authenticate user credentials
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginDto.email(),
                        loginDto.password()
                )
        );

        // 2. Set Authentication in SecurityContext
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // 3. Issue Access Token (15 mins) & Refresh Token (7 days)
        String accessToken = jwtTokenProvider.generateToken(authentication);
        String refreshToken = jwtTokenProvider.generateRefreshToken(loginDto.email());

        // 4. Attach HttpOnly Cookie for Refresh Token directly to response
        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)            // XSS Protection
                .secure(false)             // Set to true in production (HTTPS)
                .path("/java-wtc-api/v1/auth")      // Cookie scoped to auth routes
                .maxAge(7 * 24 * 60 * 60)  // 7 days
                .sameSite("Strict")        // CSRF Protection
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        // 5. Fetch User profile details & permissions
        User user = userRepository.findByEmail(loginDto.email())
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + loginDto.email()));

        Set<String> permissions = (user.getRole() != null && user.getRole().getPermissions() != null)
                ? user.getRole().getPermissions().stream()
                    .map(Permission::getName)
                    .collect(Collectors.toSet())
                : Set.of();

        // 6. Return AuthResponse directly
        return new AuthResponse(
                accessToken,
                "Login successful",
                user.getEmail(),
                user.getRole() != null ? user.getRole().getName() : null,
                permissions
        );
    }

    public AuthResponse refreshAccessToken(String refreshToken) {
        // 1. Validate refresh token
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new IllegalArgumentException("Invalid or expired refresh token");
        }

        // 2. Extract email from refresh token
        String email = jwtTokenProvider.getEmailFromJwt(refreshToken);

        // 3. Fetch User profile & permissions
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        Set<String> permissions = (user.getRole() != null && user.getRole().getPermissions() != null)
                ? user.getRole().getPermissions().stream()
                    .map(Permission::getName)
                    .collect(Collectors.toSet())
                : Set.of();

        // 4. Issue fresh Access Token
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(email, null, Set.of());
        String newAccessToken = jwtTokenProvider.generateToken(authentication);

        return new AuthResponse(
                newAccessToken,
                "Token refreshed successfully",
                user.getEmail(),
                user.getRole() != null ? user.getRole().getName() : null,
                permissions
        );
    }

    public void logout(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .path("/java-wtc-api/v1/auth")
                .maxAge(0) // Clear cookie
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
