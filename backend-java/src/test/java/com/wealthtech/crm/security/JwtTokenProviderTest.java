package com.wealthtech.crm.security;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private static final String TEST_SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250655368566D5971";

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", TEST_SECRET);
        ReflectionTestUtils.setField(jwtTokenProvider, "expirationInMs", 900000L); // 15 mins
        ReflectionTestUtils.setField(jwtTokenProvider, "refreshExpirationInMs", 604800000L); // 7 days
    }

    @Test
    @DisplayName("Should generate valid JWT access token and correctly extract subject email")
    void testGenerateAndValidateToken() {
        UserDetails userDetails = new User("advisor@wealthtech.com", "password", Collections.emptyList());
        Authentication auth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

        String token = jwtTokenProvider.generateToken(auth);

        assertThat(token).isNotBlank();
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        assertThat(jwtTokenProvider.getEmailFromJwt(token)).isEqualTo("advisor@wealthtech.com");
    }

    @Test
    @DisplayName("Should generate valid refresh token with 7-day expiration")
    void testGenerateRefreshToken() {
        String email = "client@example.com";
        String refreshToken = jwtTokenProvider.generateRefreshToken(email);

        assertThat(refreshToken).isNotBlank();
        assertThat(jwtTokenProvider.validateToken(refreshToken)).isTrue();
        assertThat(jwtTokenProvider.getEmailFromJwt(refreshToken)).isEqualTo(email);
    }

    @Test
    @DisplayName("Should reject malformed or tampered JWT token")
    void testTamperedTokenFailsValidation() {
        assertThat(jwtTokenProvider.validateToken("not-a-valid-jwt")).isFalse();
        assertThat(jwtTokenProvider.validateToken("eyJhbGciOiJIUzI1NiJ9.invalidPayload.signature")).isFalse();
    }
}
