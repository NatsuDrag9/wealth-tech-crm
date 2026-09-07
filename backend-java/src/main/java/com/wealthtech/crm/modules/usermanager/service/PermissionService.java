package com.wealthtech.crm.modules.usermanager.service;

import com.wealthtech.crm.modules.usermanager.dto.PermissionResponse;
import com.wealthtech.crm.modules.usermanager.entity.Permission;
import com.wealthtech.crm.modules.usermanager.repository.PermissionRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PermissionService {
    private final PermissionRepository permissionRepository;

    public PermissionService(PermissionRepository permissionRepository) {
        this.permissionRepository = permissionRepository;
    }

    public List<PermissionResponse> getAllPermissions() {
        return permissionRepository.findAllByOrderByIdAsc().stream()
                .map(p -> new PermissionResponse(p.getId(), p.getName(), p.getDisplayName(), p.getResource()))
                .toList();
    }

    public Permission getOrCreate(String name, String displayName, String resource) {
        return permissionRepository.findByName(name)
                .orElseGet(() -> {
                    Permission permission = new Permission();
                    permission.setName(name);
                    permission.setDisplayName(displayName);
                    permission.setResource(resource);
                    return permissionRepository.save(permission);
                });
    }
}
