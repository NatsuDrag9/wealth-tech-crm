package com.wealthtech.crm.modules.usermanager.controller;

import com.wealthtech.crm.common.dto.DropdownOption;
import com.wealthtech.crm.modules.usermanager.dto.*;
import com.wealthtech.crm.modules.usermanager.entity.User;
import com.wealthtech.crm.modules.usermanager.exception.NotFoundException;
import com.wealthtech.crm.modules.usermanager.repository.UserRepository;
import com.wealthtech.crm.modules.usermanager.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    private final UserService userService;
    private final UserRepository userRepository;

    public UserController(UserService userService, UserRepository userRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('user:create')")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request, Authentication authentication) {
        Long currentUserId = resolveCurrentUserId(authentication);
        UserResponse response = userService.createUser(request, currentUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('user:read')")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        UserResponse response = userService.getUser(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('user:update')")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        UserResponse response = userService.updateUser(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('user:read')")
    public ResponseEntity<CursorPaginatedResponse<UserResponse>> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "50") int page_size
    ) {
        CursorPaginatedResponse<UserResponse> response = userService.getUserList(search, cursor, page_size);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AuthenticatedUserResponse> getAuthenticatedUser(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found"));
        AuthenticatedUserResponse response = userService.getAuthenticatedUser(user.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/dropdown")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DropdownOption<Long>>> getUserDropdown(
            @RequestParam(required = false) Long groupId,
            @RequestParam(required = false) Long excludeUserId
    ) {
        List<DropdownOption<Long>> response = userService.getUserDropdown(groupId, excludeUserId);
        return ResponseEntity.ok(response);
    }

    private Long resolveCurrentUserId(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .map(User::getId)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}
