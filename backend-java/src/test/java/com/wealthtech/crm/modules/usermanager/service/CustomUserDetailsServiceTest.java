package com.wealthtech.crm.modules.usermanager.service;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import com.wealthtech.crm.modules.usermanager.entity.Permission;
import com.wealthtech.crm.modules.usermanager.entity.Role;
import com.wealthtech.crm.modules.usermanager.entity.User;
import com.wealthtech.crm.modules.usermanager.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class CustomUserDetailsServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CustomUserDetailsService userDetailsService;

    @Test
    @DisplayName("Should load user with ROLE_ prefix and granular authorities")
    void testLoadUserByUsernameSuccess() {
        Permission permission = new Permission();
        permission.setName("CLIENT_READ");

        Role role = new Role();
        role.setName("ADVISOR");
        role.setPermissions(Set.of(permission));

        User user = new User();
        user.setEmail("advisor@wealthtech.com");
        user.setPassword("hashed_secret");
        user.setRole(role);

        when(userRepository.findByEmail("advisor@wealthtech.com")).thenReturn(Optional.of(user));

        UserDetails userDetails = userDetailsService.loadUserByUsername("advisor@wealthtech.com");

        assertThat(userDetails).isNotNull();
        assertThat(userDetails.getUsername()).isEqualTo("advisor@wealthtech.com");
        assertThat(userDetails.getPassword()).isEqualTo("hashed_secret");
        assertThat(userDetails.getAuthorities())
                .extracting("authority")
                .contains("ROLE_ADVISOR", "CLIENT_READ");
    }

    @Test
    @DisplayName("Should throw UsernameNotFoundException when user is not found by email")
    void testLoadUserByUsernameNotFound() {
        when(userRepository.findByEmail("unknown@wealthtech.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userDetailsService.loadUserByUsername("unknown@wealthtech.com"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("User not found with email");
    }
}
