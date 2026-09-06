package com.wealthtech.crm.modules.usermanager.controller;

import com.wealthtech.crm.modules.usermanager.dto.*;
import com.wealthtech.crm.modules.usermanager.entity.User;
import com.wealthtech.crm.modules.usermanager.exception.NotFoundException;
import com.wealthtech.crm.modules.usermanager.repository.UserRepository;
import com.wealthtech.crm.modules.usermanager.service.GroupService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/groups")
public class GroupController {
    private final GroupService groupService;
    private final UserRepository userRepository;

    public GroupController(GroupService groupService, UserRepository userRepository) {
        this.groupService = groupService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<GroupResponse> createGroup(@Valid @RequestBody CreateGroupRequest request, Authentication authentication) {
        Long currentUserId = resolveCurrentUserId(authentication);
        GroupResponse response = groupService.createGroup(request, currentUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<GroupResponse> getGroup(@PathVariable Long id) {
        GroupResponse response = groupService.getGroup(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<GroupResponse> updateGroup(@PathVariable Long id, @Valid @RequestBody UpdateGroupRequest request) {
        GroupResponse response = groupService.updateGroup(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<CursorPaginatedResponse<GroupResponse>> getGroups(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "50") int page_size
    ) {
        CursorPaginatedResponse<GroupResponse> response = groupService.getGroupList(search, cursor, page_size);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/dropdown")
    public ResponseEntity<List<DropdownOption<Long>>> getGroupDropdown() {
        List<DropdownOption<Long>> response = groupService.getGroupDropdown();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/roles")
    public ResponseEntity<List<RoleResponse>> getGroupRoles(@PathVariable Long id) {
        List<RoleResponse> response = groupService.getGroupRoles(id);
        return ResponseEntity.ok(response);
    }

    private Long resolveCurrentUserId(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .map(User::getId)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}
