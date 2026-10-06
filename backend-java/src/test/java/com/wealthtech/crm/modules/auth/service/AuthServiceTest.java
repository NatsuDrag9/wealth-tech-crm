package com.wealthtech.crm.modules.auth.service;

import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.Mock;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import com.wealthtech.crm.modules.auth.dto.AuthResponse;
import com.wealthtech.crm.modules.auth.dto.LoginDto;
import com.wealthtech.crm.modules.usermanager.entity.Role;
import com.wealthtech.crm.modules.usermanager.entity.User;
import com.wealthtech.crm.modules.usermanager.repository.UserRepository;
import com.wealthtech.crm.security.JwtTokenProvider;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    @Mock
    private UserRepository userRepository;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(authenticationManager, jwtTokenProvider, userRepository);
    }

    @Test
    @DisplayName("Should successfully authenticate user, set HttpOnly refresh cookie, and return AuthResponse")
    void testSuccessfulLogin() {
        LoginDto loginDto = new LoginDto("advisor@wealthtech.com", "Password@123");
        MockHttpServletResponse response = new MockHttpServletResponse();

        Authentication auth = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);

        when(jwtTokenProvider.generateToken(auth)).thenReturn("mock-access-token");
        when(jwtTokenProvider.generateRefreshToken(loginDto.email())).thenReturn("mock-refresh-token");

        Role role = Role.builder().name("RM").permissions(Collections.emptySet()).build();
        User user = User.builder()
                .id(1L)
                .email(loginDto.email())
                .firstName("Aditi")
                .lastName("Verma")
                .role(role)
                .build();
        when(userRepository.findByEmail(loginDto.email())).thenReturn(Optional.of(user));

        AuthResponse authResponse = authService.login(loginDto, response);

        assertThat(authResponse).isNotNull();
        assertThat(authResponse.accessToken()).isEqualTo("mock-access-token");
        assertThat(authResponse.email()).isEqualTo("advisor@wealthtech.com");

        // Verify HttpOnly cookie header was attached
        String setCookieHeader = response.getHeader("Set-Cookie");
        assertThat(setCookieHeader).contains("refreshToken=mock-refresh-token");
        assertThat(setCookieHeader).contains("HttpOnly");
    }

    @Test
    @DisplayName("Should throw BadCredentialsException when password authentication fails")
    void testBadCredentialsFailsLogin() {
        LoginDto loginDto = new LoginDto("advisor@wealthtech.com", "WrongPassword");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Invalid credentials"));

        assertThatThrownBy(() -> authService.login(loginDto, response))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Invalid credentials");
    }

    @Test
    @DisplayName("Should clear refresh token cookie on logout")
    void testLogoutClearsCookie() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        authService.logout(response);

        String setCookieHeader = response.getHeader("Set-Cookie");
        assertThat(setCookieHeader).contains("refreshToken=");
        assertThat(setCookieHeader).contains("Max-Age=0");
    }
}
