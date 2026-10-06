package com.wealthtech.crm.modules.usermanager.service;

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

import com.wealthtech.crm.modules.usermanager.dto.CreateGroupRequest;
import com.wealthtech.crm.modules.usermanager.dto.GroupResponse;
import com.wealthtech.crm.modules.usermanager.dto.UpdateGroupRequest;
import com.wealthtech.crm.modules.usermanager.entity.Group;
import com.wealthtech.crm.modules.usermanager.exception.ConflictException;
import com.wealthtech.crm.modules.usermanager.exception.NotFoundException;
import com.wealthtech.crm.modules.usermanager.repository.GroupRepository;
import com.wealthtech.crm.modules.usermanager.repository.RoleRepository;

@ExtendWith(MockitoExtension.class)
class GroupServiceTest {

    @Mock
    private GroupRepository groupRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private UserDisplayService userDisplayService;

    @InjectMocks
    private GroupService groupService;

    @Test
    @DisplayName("Should create group successfully when name is unique")
    void testCreateGroupSuccess() {
        CreateGroupRequest request = new CreateGroupRequest("Private Wealth", "HNW client servicing");
        when(groupRepository.existsByName("Private Wealth")).thenReturn(false);

        when(groupRepository.save(any(Group.class))).thenAnswer(inv -> {
            Group g = inv.getArgument(0);
            g.setId(10L);
            return g;
        });

        GroupResponse response = groupService.createGroup(request, 1L);

        assertThat(response).isNotNull();
        assertThat(response.name()).isEqualTo("Private Wealth");
        assertThat(response.id()).isEqualTo(10L);
        verify(groupRepository).save(any(Group.class));
    }

    @Test
    @DisplayName("Should throw ConflictException when creating group with existing name")
    void testCreateGroupDuplicateThrowsConflict() {
        CreateGroupRequest request = new CreateGroupRequest("Private Wealth", "Duplicate");
        when(groupRepository.existsByName("Private Wealth")).thenReturn(true);

        assertThatThrownBy(() -> groupService.createGroup(request, 1L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Group name already exists");
    }

    @Test
    @DisplayName("Should update group name and description successfully")
    void testUpdateGroupSuccess() {
        Group group = new Group();
        group.setId(10L);
        group.setName("Old Name");
        group.setDescription("Old Description");

        when(groupRepository.findById(10L)).thenReturn(Optional.of(group));
        when(groupRepository.existsByName("New Name")).thenReturn(false);
        when(groupRepository.save(any(Group.class))).thenReturn(group);

        GroupResponse response = groupService.updateGroup(10L, new UpdateGroupRequest("New Name", "New Description"));

        assertThat(response).isNotNull();
        assertThat(group.getName()).isEqualTo("New Name");
        assertThat(group.getDescription()).isEqualTo("New Description");
        verify(groupRepository).save(group);
    }

    @Test
    @DisplayName("Should throw NotFoundException when group does not exist")
    void testGetGroupNotFound() {
        when(groupRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> groupService.getGroup(404L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Group not found");
    }
}
