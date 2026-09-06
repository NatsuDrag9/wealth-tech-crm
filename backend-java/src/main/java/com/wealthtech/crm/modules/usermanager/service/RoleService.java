package com.wealthtech.crm.modules.usermanager.service;

import com.wealthtech.crm.common.dto.DropdownOption;
import com.wealthtech.crm.modules.usermanager.dto.*;
import com.wealthtech.crm.modules.usermanager.entity.Group;
import com.wealthtech.crm.modules.usermanager.entity.Permission;
import com.wealthtech.crm.modules.usermanager.entity.Role;
import com.wealthtech.crm.modules.usermanager.exception.ConflictException;
import com.wealthtech.crm.modules.usermanager.exception.NotFoundException;
import com.wealthtech.crm.modules.usermanager.repository.GroupRepository;
import com.wealthtech.crm.modules.usermanager.repository.PermissionRepository;
import com.wealthtech.crm.modules.usermanager.repository.RoleRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RoleService {
    private final RoleRepository roleRepository;
    private final GroupRepository groupRepository;
    private final PermissionRepository permissionRepository;
    private final UserDisplayService userDisplayService;

    public RoleService(RoleRepository roleRepository, GroupRepository groupRepository, PermissionRepository permissionRepository, UserDisplayService userDisplayService) {
        this.roleRepository = roleRepository;
        this.groupRepository = groupRepository;
        this.permissionRepository = permissionRepository;
        this.userDisplayService = userDisplayService;
    }

    public RoleResponse createRole(CreateRoleRequest request, Long currentUserId) {
        Group group = groupRepository.findById(request.groupId())
                .orElseThrow(() -> new NotFoundException("Group not found"));

        if (roleRepository.existsByGroupIdAndName(request.groupId(), request.name())) {
            throw new ConflictException("Role name already exists in this group");
        }

        Role role = new Role();
        role.setName(request.name());
        role.setDescription(request.description());
        role.setGroup(group);
        role.setCreatedBy(currentUserId);

        Role saved = roleRepository.save(role);
        return mapToResponse(saved);
    }

    public RoleResponse getRole(Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Role not found"));
        return mapToResponse(role);
    }

    public RoleResponse updateRole(Long id, UpdateRoleRequest request) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Role not found"));

        if (request.name() != null && !request.name().isBlank()) {
            if (!request.name().equals(role.getName()) && roleRepository.existsByGroupIdAndName(role.getGroup().getId(), request.name())) {
                throw new ConflictException("Role name already exists in this group");
            }
            role.setName(request.name());
        }
        if (request.description() != null) {
            role.setDescription(request.description());
        }

        Role saved = roleRepository.save(role);
        return mapToResponse(saved);
    }

    public RoleResponse setPermissions(Long id, SetPermissionsRequest request) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Role not found"));

        Set<Permission> permissions = permissionRepository.findAllById(request.permissionIds()).stream()
                .collect(Collectors.toSet());

        role.setPermissions(permissions);
        Role saved = roleRepository.save(role);
        return mapToResponse(saved);
    }

    public CursorPaginatedResponse<RoleResponse> getRoleList(Long groupId, String search, Long cursor, int pageSize) {
        if (pageSize <= 0 || pageSize > 1500) {
            pageSize = 50;
        }

        Pageable pageable = PageRequest.of(0, pageSize);
        List<Role> roles;

        if (groupId != null) {
            roles = roleRepository.findByGroupIdAndIdGreaterThanOrderByIdAsc(groupId, cursor == null ? 0L : cursor, pageable);
        } else {
            roles = roleRepository.findByIdGreaterThanOrderByIdAsc(cursor == null ? 0L : cursor, pageable);
        }

        List<RoleResponse> results = roles.stream()
                .map(this::mapToResponse)
                .toList();

        String nextCursor = results.isEmpty() ? null : String.valueOf(results.get(results.size() - 1).id());

        return new CursorPaginatedResponse<>(
                results,
                results.size() == pageSize ? nextCursor : null,
                null,
                null,
                null,
                null
        );
    }

    public List<DropdownOption<Long>> getRoleDropdown(Long groupId) {
        if (groupId == null) {
            return List.of();
        }
        return roleRepository.findByGroupId(groupId).stream()
                .map(r -> new DropdownOption<>(r.getName(), r.getId()))
                .toList();
    }

    private RoleResponse mapToResponse(Role role) {
        Set<String> permissions = (role.getPermissions() != null)
                ? role.getPermissions().stream().map(Permission::getCodename).collect(Collectors.toSet())
                : Set.of();

        return new RoleResponse(
                role.getId(),
                role.getName(),
                role.getDescription(),
                userDisplayService.toDropdownOption(role.getGroup()),
                permissions,
                role.getCreatedAt(),
                userDisplayService.resolveUser(role.getCreatedBy()),
                role.getUpdatedAt(),
                userDisplayService.resolveUser(role.getUpdatedBy())
        );
    }
}
