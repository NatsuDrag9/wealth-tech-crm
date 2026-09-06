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
                .map(p -> new PermissionResponse(p.getId(), p.getCodename(), p.getName(), p.getContentType()))
                .toList();
    }

    public Permission getOrCreate(String codename, String name, String contentType) {
        return permissionRepository.findByCodename(codename)
                .orElseGet(() -> {
                    Permission permission = new Permission();
                    permission.setCodename(codename);
                    permission.setName(name);
                    permission.setContentType(contentType);
                    return permissionRepository.save(permission);
                });
    }
}
