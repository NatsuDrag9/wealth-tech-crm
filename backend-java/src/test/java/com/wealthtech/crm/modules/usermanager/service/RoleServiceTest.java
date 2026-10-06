package com.wealthtech.crm.modules.usermanager.service;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.wealthtech.crm.modules.usermanager.dto.CreateRoleRequest;
import com.wealthtech.crm.modules.usermanager.dto.RoleResponse;
import com.wealthtech.crm.modules.usermanager.dto.SetPermissionsRequest;
import com.wealthtech.crm.modules.usermanager.entity.Group;
import com.wealthtech.crm.modules.usermanager.entity.Permission;
import com.wealthtech.crm.modules.usermanager.entity.Role;
import com.wealthtech.crm.modules.usermanager.exception.ConflictException;
import com.wealthtech.crm.modules.usermanager.exception.NotFoundException;
import com.wealthtech.crm.modules.usermanager.repository.GroupRepository;
import com.wealthtech.crm.modules.usermanager.repository.PermissionRepository;
import com.wealthtech.crm.modules.usermanager.repository.RoleRepository;

@ExtendWith(MockitoExtension.class)
class RoleServiceTest {

    @Mock
    private RoleRepository roleRepository;
    @Mock
    private GroupRepository groupRepository;
    @Mock
    private PermissionRepository permissionRepository;
    @Mock
    private UserDisplayService userDisplayService;

    @InjectMocks
    private RoleService roleService;

    @Test
    @DisplayName("Should create role successfully within a valid group")
    void testCreateRoleSuccess() {
        CreateRoleRequest request = new CreateRoleRequest(10L, "COMPLIANCE_OFFICER", "Audits recommendations");

        Group group = new Group();
        group.setId(10L);
        group.setName("Compliance");
        when(groupRepository.findById(10L)).thenReturn(Optional.of(group));
        when(roleRepository.existsByGroupIdAndName(10L, "COMPLIANCE_OFFICER")).thenReturn(false);

        when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> {
            Role r = invocation.getArgument(0);
            r.setId(50L);
            return r;
        });

        RoleResponse response = roleService.createRole(request, 1L);

        assertThat(response).isNotNull();
        assertThat(response.name()).isEqualTo("COMPLIANCE_OFFICER");
        verify(roleRepository).save(any(Role.class));
    }

    @Test
    @DisplayName("Should throw ConflictException when creating role with duplicate name in the same group")
    void testCreateRoleDuplicateInGroupThrowsConflict() {
        CreateRoleRequest request = new CreateRoleRequest(10L, "ADVISOR", "Wealth advisor");

        Group group = new Group();
        group.setId(10L);
        when(groupRepository.findById(10L)).thenReturn(Optional.of(group));
        when(roleRepository.existsByGroupIdAndName(10L, "ADVISOR")).thenReturn(true);

        assertThatThrownBy(() -> roleService.createRole(request, 1L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Role name already exists in this group");
    }

    @Test
    @DisplayName("Should update role permissions successfully")
    void testSetPermissionsSuccess() {
        Role role = new Role();
        role.setId(5L);
        role.setName("ADVISOR");
        role.setPermissions(new HashSet<>());

        Permission p1 = new Permission();
        p1.setId(1L);
        p1.setName("PORTFOLIO_REVIEW_CREATE");

        Permission p2 = new Permission();
        p2.setId(2L);
        p2.setName("CLIENT_VIEW");

        when(roleRepository.findById(5L)).thenReturn(Optional.of(role));
        when(permissionRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(p1, p2));
        when(roleRepository.save(any(Role.class))).thenReturn(role);

        RoleResponse response = roleService.setPermissions(5L, new SetPermissionsRequest(List.of(1L, 2L)));

        assertThat(response).isNotNull();
        assertThat(role.getPermissions()).containsExactlyInAnyOrder(p1, p2);
        verify(roleRepository).save(role);
    }

    @Test
    @DisplayName("Should throw NotFoundException when updating non-existent role")
    void testGetRoleNotFound() {
        when(roleRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> roleService.getRole(999L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Role not found");
    }
}
