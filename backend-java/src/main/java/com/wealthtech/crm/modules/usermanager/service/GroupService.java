package com.wealthtech.crm.modules.usermanager.service;

import com.wealthtech.crm.common.dto.DropdownOption;
import com.wealthtech.crm.modules.usermanager.dto.*;
import com.wealthtech.crm.modules.usermanager.entity.Group;
import com.wealthtech.crm.modules.usermanager.entity.Role;
import com.wealthtech.crm.modules.usermanager.exception.ConflictException;
import com.wealthtech.crm.modules.usermanager.exception.NotFoundException;
import com.wealthtech.crm.modules.usermanager.repository.GroupRepository;
import com.wealthtech.crm.modules.usermanager.repository.RoleRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class GroupService {
    private final GroupRepository groupRepository;
    private final RoleRepository roleRepository;
    private final UserDisplayService userDisplayService;

    public GroupService(GroupRepository groupRepository, RoleRepository roleRepository, UserDisplayService userDisplayService) {
        this.groupRepository = groupRepository;
        this.roleRepository = roleRepository;
        this.userDisplayService = userDisplayService;
    }

    public GroupResponse createGroup(CreateGroupRequest request, Long currentUserId) {
        if (groupRepository.existsByName(request.name())) {
            throw new ConflictException("Group name already exists");
        }

        Group group = new Group();
        group.setName(request.name());
        group.setDescription(request.description());
        group.setCreatedBy(currentUserId);

        Group saved = groupRepository.save(group);
        return mapToResponse(saved);
    }

    public GroupResponse getGroup(Long id) {
        Group group = groupRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Group not found"));
        return mapToResponse(group);
    }

    public GroupResponse updateGroup(Long id, UpdateGroupRequest request) {
        Group group = groupRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Group not found"));

        if (request.name() != null && !request.name().isBlank()) {
            if (!request.name().equals(group.getName()) && groupRepository.existsByName(request.name())) {
                throw new ConflictException("Group name already exists");
            }
            group.setName(request.name());
        }
        if (request.description() != null) {
            group.setDescription(request.description());
        }

        Group saved = groupRepository.save(group);
        return mapToResponse(saved);
    }

    public CursorPaginatedResponse<GroupResponse> getGroupList(String search, Long cursor, int pageSize) {
        if (pageSize <= 0 || pageSize > 1500) {
            pageSize = 50;
        }

        Pageable pageable = PageRequest.of(0, pageSize);
        List<Group> groups;

        if (search != null && !search.isBlank()) {
            groups = groupRepository.searchByIdGreaterThanOrderByIdAsc(search, cursor == null ? 0L : cursor, pageable);
        } else {
            groups = groupRepository.findByIdGreaterThanOrderByIdAsc(cursor == null ? 0L : cursor, pageable);
        }

        List<GroupResponse> results = groups.stream()
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

    public List<DropdownOption<Long>> getGroupDropdown() {
        return groupRepository.findAll().stream()
                .map(g -> new DropdownOption<>(g.getName(), g.getId()))
                .toList();
    }

    public List<RoleResponse> getGroupRoles(Long groupId) {
        List<Role> roles = roleRepository.findByGroupId(groupId);
        return roles.stream()
                .map(this::mapRoleToResponse)
                .toList();
    }

    private GroupResponse mapToResponse(Group group) {
        return new GroupResponse(
                group.getId(),
                group.getName(),
                group.getDescription(),
                group.getCreatedAt(),
                userDisplayService.resolveUser(group.getCreatedBy()),
                group.getUpdatedAt(),
                userDisplayService.resolveUser(group.getUpdatedBy())
        );
    }

    private RoleResponse mapRoleToResponse(Role role) {
        Set<String> permissions = (role.getPermissions() != null)
                ? role.getPermissions().stream().map(p -> p.getName()).collect(Collectors.toSet())
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
