package com.wealthtech.crm.modules.usermanager.controller;

import com.wealthtech.crm.modules.usermanager.dto.PermissionResponse;
import com.wealthtech.crm.modules.usermanager.service.PermissionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/java-wtc-api/v1/permissions")
public class PermissionController {
    private final PermissionService permissionService;

    public PermissionController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('role:read', 'role:update', 'rolepermission:read')")
    public ResponseEntity<List<PermissionResponse>> getPermissions() {
        List<PermissionResponse> response = permissionService.getAllPermissions();
        return ResponseEntity.ok(response);
    }
}
