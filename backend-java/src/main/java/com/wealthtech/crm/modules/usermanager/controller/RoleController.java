package com.wealthtech.crm.modules.usermanager.controller;

import com.wealthtech.crm.modules.usermanager.dto.*;
import com.wealthtech.crm.modules.usermanager.entity.User;
import com.wealthtech.crm.modules.usermanager.exception.NotFoundException;
import com.wealthtech.crm.modules.usermanager.repository.UserRepository;
import com.wealthtech.crm.modules.usermanager.service.RoleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/roles")
public class RoleController {
    private final RoleService roleService;
    private final UserRepository userRepository;

    public RoleController(RoleService roleService, UserRepository userRepository) {
        this.roleService = roleService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<RoleResponse> createRole(@Valid @RequestBody CreateRoleRequest request, Authentication authentication) {
        Long currentUserId = resolveCurrentUserId(authentication);
        RoleResponse response = roleService.createRole(request, currentUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoleResponse> getRole(@PathVariable Long id) {
        RoleResponse response = roleService.getRole(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<RoleResponse> updateRole(@PathVariable Long id, @Valid @RequestBody UpdateRoleRequest request) {
        RoleResponse response = roleService.updateRole(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<CursorPaginatedResponse<RoleResponse>> getRoles(
            @RequestParam(required = false) Long groupId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "50") int page_size
    ) {
        CursorPaginatedResponse<RoleResponse> response = roleService.getRoleList(groupId, search, cursor, page_size);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/dropdown")
    public ResponseEntity<List<DropdownOption<Long>>> getRoleDropdown(@RequestParam(required = false) Long groupId) {
        List<DropdownOption<Long>> response = roleService.getRoleDropdown(groupId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/set-permissions")
    public ResponseEntity<RoleResponse> setRolePermissions(@PathVariable Long id, @Valid @RequestBody SetPermissionsRequest request) {
        RoleResponse response = roleService.setPermissions(id, request);
        return ResponseEntity.ok(response);
    }

    private Long resolveCurrentUserId(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .map(User::getId)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}
