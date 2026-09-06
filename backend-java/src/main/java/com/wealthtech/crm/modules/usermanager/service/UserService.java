package com.wealthtech.crm.modules.usermanager.service;

import com.wealthtech.crm.common.dto.DropdownOption;
import com.wealthtech.crm.modules.usermanager.dto.*;
import com.wealthtech.crm.modules.usermanager.entity.Group;
import com.wealthtech.crm.modules.usermanager.entity.Role;
import com.wealthtech.crm.modules.usermanager.entity.User;
import com.wealthtech.crm.modules.usermanager.exception.ConflictException;
import com.wealthtech.crm.modules.usermanager.exception.NotFoundException;
import com.wealthtech.crm.modules.usermanager.repository.GroupRepository;
import com.wealthtech.crm.modules.usermanager.repository.RoleRepository;
import com.wealthtech.crm.modules.usermanager.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final RoleRepository roleRepository;
    private final UserDisplayService userDisplayService;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, GroupRepository groupRepository, RoleRepository roleRepository, UserDisplayService userDisplayService, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.groupRepository = groupRepository;
        this.roleRepository = roleRepository;
        this.userDisplayService = userDisplayService;
        this.passwordEncoder = passwordEncoder;
    }

    public UserResponse createUser(CreateUserRequest request, Long currentUserId) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ConflictException("Email already exists");
        }

        String defaultPassword = UUID.randomUUID().toString();
        String hashedPassword = passwordEncoder.encode(defaultPassword);

        User user = new User();
        user.setEmail(request.email());
        user.setPassword(hashedPassword);
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setLanguages(request.languages());
        user.setCreatedBy(currentUserId);

        if (request.groupId() != null) {
            Group group = groupRepository.findById(request.groupId())
                    .orElseThrow(() -> new NotFoundException("Group not found"));
            user.setGroup(group);
        }

        if (request.roleId() != null) {
            Role role = roleRepository.findById(request.roleId())
                    .orElseThrow(() -> new NotFoundException("Role not found"));
            user.setRole(role);
        }

        if (request.reportsToId() != null) {
            User reportsTo = userRepository.findById(request.reportsToId())
                    .orElseThrow(() -> new NotFoundException("Reports-to user not found"));
            user.setReportsTo(reportsTo);
        }

        User saved = userRepository.save(user);
        return mapToResponse(saved);
    }

    public UserResponse getUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return mapToResponse(user);
    }

    public UserResponse updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (request.email() != null && !request.email().isBlank()) {
            if (!request.email().equals(user.getEmail()) && userRepository.existsByEmail(request.email())) {
                throw new ConflictException("Email already exists");
            }
            user.setEmail(request.email());
        }

        if (request.firstName() != null && !request.firstName().isBlank()) {
            user.setFirstName(request.firstName());
        }
        if (request.lastName() != null && !request.lastName().isBlank()) {
            user.setLastName(request.lastName());
        }
        if (request.languages() != null) {
            user.setLanguages(request.languages());
        }

        if (request.groupId() != null) {
            Group group = groupRepository.findById(request.groupId())
                    .orElseThrow(() -> new NotFoundException("Group not found"));
            user.setGroup(group);
        }

        if (request.roleId() != null) {
            Role role = roleRepository.findById(request.roleId())
                    .orElseThrow(() -> new NotFoundException("Role not found"));
            user.setRole(role);
        }

        if (request.reportsToId() != null) {
            User reportsTo = userRepository.findById(request.reportsToId())
                    .orElseThrow(() -> new NotFoundException("Reports-to user not found"));
            user.setReportsTo(reportsTo);
        }

        User saved = userRepository.save(user);
        return mapToResponse(saved);
    }

    public CursorPaginatedResponse<UserResponse> getUserList(String search, Long cursor, int pageSize) {
        if (pageSize <= 0 || pageSize > 1500) {
            pageSize = 50;
        }

        Pageable pageable = PageRequest.of(0, pageSize);
        List<User> users;

        if (search != null && !search.isBlank()) {
            users = userRepository.searchByIdGreaterThanOrderByIdAsc(search, cursor == null ? 0L : cursor, pageable);
        } else {
            users = userRepository.findByIdGreaterThanOrderByIdAsc(cursor == null ? 0L : cursor, pageable);
        }

        List<UserResponse> results = users.stream()
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

    public List<DropdownOption<Long>> getUserDropdown(Long groupId, Long excludeUserId) {
        if (groupId == null) {
            return List.of();
        }
        List<User> users = userRepository.findByGroupId(groupId);
        return users.stream()
                .filter(u -> excludeUserId == null || !u.getId().equals(excludeUserId))
                .map(u -> new DropdownOption<>(u.getFirstName() + " " + u.getLastName(), u.getId()))
                .toList();
    }

    public AuthenticatedUserResponse getAuthenticatedUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Set<String> permissions = (user.getRole() != null && user.getRole().getPermissions() != null)
                ? user.getRole().getPermissions().stream()
                        .map(p -> p.getCodename())
                        .collect(Collectors.toSet())
                : Set.of();

        return new AuthenticatedUserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getFirstName() + " " + user.getLastName(),
                userDisplayService.resolve(user.getRole() != null ? user.getRole().getId() : null),
                userDisplayService.resolve(user.getGroup() != null ? user.getGroup().getId() : null),
                null,
                permissions
        );
    }

    private UserResponse mapToResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getFirstName() + " " + user.getLastName(),
                userDisplayService.resolve(user.getRole() != null ? user.getRole().getId() : null),
                userDisplayService.resolve(user.getGroup() != null ? user.getGroup().getId() : null),
                userDisplayService.resolve(user.getReportsTo() != null ? user.getReportsTo().getId() : null),
                user.getCreatedAt(),
                user.getCreatedBy(),
                user.getLanguages()
        );
    }
}
