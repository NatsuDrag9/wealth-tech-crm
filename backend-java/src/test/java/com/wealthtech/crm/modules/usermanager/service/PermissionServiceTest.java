package com.wealthtech.crm.modules.usermanager.service;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.wealthtech.crm.modules.usermanager.dto.PermissionResponse;
import com.wealthtech.crm.modules.usermanager.entity.Permission;
import com.wealthtech.crm.modules.usermanager.repository.PermissionRepository;

@ExtendWith(MockitoExtension.class)
class PermissionServiceTest {

    @Mock
    private PermissionRepository permissionRepository;

    @InjectMocks
    private PermissionService permissionService;

    @Test
    @DisplayName("Should return all permissions mapped to responses ordered by ID")
    void testGetAllPermissions() {
        Permission p1 = new Permission();
        p1.setId(1L);
        p1.setName("CLIENT_CREATE");
        p1.setDisplayName("Create Client");
        p1.setResource("clients");

        Permission p2 = new Permission();
        p2.setId(2L);
        p2.setName("CLIENT_DELETE");
        p2.setDisplayName("Delete Client");
        p2.setResource("clients");

        when(permissionRepository.findAllByOrderByIdAsc()).thenReturn(List.of(p1, p2));

        List<PermissionResponse> list = permissionService.getAllPermissions();

        assertThat(list).hasSize(2);
        assertThat(list.get(0).name()).isEqualTo("CLIENT_CREATE");
        assertThat(list.get(1).name()).isEqualTo("CLIENT_DELETE");
    }

    @Test
    @DisplayName("Should return existing permission if found in getOrCreate")
    void testGetOrCreateReturnsExisting() {
        Permission existing = new Permission();
        existing.setId(10L);
        existing.setName("PORTFOLIO_VIEW");

        when(permissionRepository.findByName("PORTFOLIO_VIEW")).thenReturn(Optional.of(existing));

        Permission result = permissionService.getOrCreate("PORTFOLIO_VIEW", "View Portfolio", "portfolio");

        assertThat(result.getId()).isEqualTo(10L);
        verify(permissionRepository, never()).save(any(Permission.class));
    }

    @Test
    @DisplayName("Should create new permission if not found in getOrCreate")
    void testGetOrCreateCreatesNew() {
        when(permissionRepository.findByName("NEW_PERM")).thenReturn(Optional.empty());
        when(permissionRepository.save(any(Permission.class))).thenAnswer(inv -> {
            Permission p = inv.getArgument(0);
            p.setId(99L);
            return p;
        });

        Permission result = permissionService.getOrCreate("NEW_PERM", "New Perm", "custom");

        assertThat(result.getId()).isEqualTo(99L);
        assertThat(result.getName()).isEqualTo("NEW_PERM");
        verify(permissionRepository).save(any(Permission.class));
    }
}
