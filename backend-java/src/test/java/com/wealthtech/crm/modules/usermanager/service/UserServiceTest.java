package com.wealthtech.crm.modules.usermanager.service;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.wealthtech.crm.modules.usermanager.dto.AuthenticatedUserResponse;
import com.wealthtech.crm.modules.usermanager.dto.CreateUserRequest;
import com.wealthtech.crm.modules.usermanager.dto.UpdateUserRequest;
import com.wealthtech.crm.modules.usermanager.dto.UserResponse;
import com.wealthtech.crm.modules.usermanager.entity.Group;
import com.wealthtech.crm.modules.usermanager.entity.Role;
import com.wealthtech.crm.modules.usermanager.entity.User;
import com.wealthtech.crm.modules.usermanager.exception.ConflictException;
import com.wealthtech.crm.modules.usermanager.exception.NotFoundException;
import com.wealthtech.crm.modules.usermanager.repository.GroupRepository;
import com.wealthtech.crm.modules.usermanager.repository.RoleRepository;
import com.wealthtech.crm.modules.usermanager.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private GroupRepository groupRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private UserDisplayService userDisplayService;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    @Test
    @DisplayName("Should create user successfully with hashed password, group, and role")
    void testCreateUserSuccess() {
        CreateUserRequest request = new CreateUserRequest(
                "advisor@wealthtech.com",
                "Rohit",
                "Imandi",
                100L,
                10L,
                null,
                List.of("English", "Hindi")
        );

        when(userRepository.existsByEmail("advisor@wealthtech.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_secret");

        Group group = new Group();
        group.setId(10L);
        group.setName("Advisory Group");
        when(groupRepository.findById(10L)).thenReturn(Optional.of(group));

        Role role = new Role();
        role.setId(100L);
        role.setName("ADVISOR");
        when(roleRepository.findById(100L)).thenReturn(Optional.of(role));

        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(1L);
            return u;
        });

        UserResponse response = userService.createUser(request, 999L);

        assertThat(response).isNotNull();
        assertThat(response.email()).isEqualTo("advisor@wealthtech.com");
        assertThat(response.firstName()).isEqualTo("Rohit");
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw ConflictException when creating user with existing email")
    void testCreateUserDuplicateEmailThrowsConflict() {
        CreateUserRequest request = new CreateUserRequest(
                "existing@wealthtech.com",
                "Jane",
                "Doe",
                null,
                null,
                null,
                List.of("English")
        );

        when(userRepository.existsByEmail("existing@wealthtech.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.createUser(request, 1L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Email already exists");
    }

    @Test
    @DisplayName("Should throw NotFoundException when group does not exist")
    void testCreateUserInvalidGroupThrowsNotFound() {
        CreateUserRequest request = new CreateUserRequest(
                "new@wealthtech.com",
                "Jane",
                "Doe",
                null,
                999L,
                null,
                List.of("English")
        );

        when(userRepository.existsByEmail("new@wealthtech.com")).thenReturn(false);
        when(groupRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.createUser(request, 1L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Group not found");
    }

    @Test
    @DisplayName("Should throw NotFoundException when updating non-existent user")
    void testUpdateUserNotFound() {
        UpdateUserRequest request = new UpdateUserRequest(
                "test@wealthtech.com",
                "First",
                "Last",
                null,
                null,
                null,
                List.of()
        );

        when(userRepository.findByIdWithRelations(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateUser(404L, request))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("User not found");
    }

    @Test
    @DisplayName("Should load authenticated user with permissions")
    void testGetAuthenticatedUser() {
        Role role = new Role();
        role.setName("ADMIN");

        User user = new User();
        user.setId(5L);
        user.setEmail("admin@wealthtech.com");
        user.setFirstName("Admin");
        user.setLastName("User");
        user.setRole(role);

        when(userRepository.findByIdWithRelations(5L)).thenReturn(Optional.of(user));

        AuthenticatedUserResponse response = userService.getAuthenticatedUser(5L);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(5L);
        assertThat(response.email()).isEqualTo("admin@wealthtech.com");
    }
}
