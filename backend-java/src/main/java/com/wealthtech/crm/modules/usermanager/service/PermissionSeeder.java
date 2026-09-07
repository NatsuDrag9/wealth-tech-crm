package com.wealthtech.crm.modules.usermanager.service;

import com.wealthtech.crm.modules.usermanager.entity.Permission;
import com.wealthtech.crm.modules.usermanager.repository.PermissionRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class PermissionSeeder implements CommandLineRunner {
    private final PermissionRepository permissionRepository;
    private final PermissionService permissionService;

    public PermissionSeeder(PermissionRepository permissionRepository, PermissionService permissionService) {
        this.permissionRepository = permissionRepository;
        this.permissionService = permissionService;
    }

    @Override
    public void run(String... args) {
        if (permissionRepository.count() > 0) {
            return;
        }

        // Clients
        seedPermission("client:read", "View Client", "client");
        seedPermission("client:create", "Create Client", "client");
        seedPermission("client:update", "Update Client", "client");
        seedPermission("client:delete", "Delete Client", "client");

        // Client Profiles
        seedPermission("clientprofile:read", "View Client Profile", "clientprofile");
        seedPermission("clientprofile:create", "Create Client Profile", "clientprofile");
        seedPermission("clientprofile:update", "Update Client Profile", "clientprofile");
        seedPermission("clientprofile:delete", "Delete Client Profile", "clientprofile");

        // Risk Appetite
        seedPermission("riskappetite:read", "View Risk Appetite", "riskappetite");
        seedPermission("riskappetite:create", "Create Risk Appetite", "riskappetite");
        seedPermission("riskappetite:update", "Update Risk Appetite", "riskappetite");
        seedPermission("riskappetite:delete", "Delete Risk Appetite", "riskappetite");

        // Portfolio Review & Entry
        seedPermission("portfolioreview:read", "View Portfolio Review", "portfolioreview");
        seedPermission("portfolioreview:create", "Create Portfolio Review", "portfolioreview");
        seedPermission("portfolioreview:update", "Update Portfolio Review", "portfolioreview");
        seedPermission("portfolioreview:delete", "Delete Portfolio Review", "portfolioreview");

        seedPermission("portfolioentry:read", "View Portfolio Entry", "portfolioentry");
        seedPermission("portfolioentry:create", "Create Portfolio Entry", "portfolioentry");
        seedPermission("portfolioentry:update", "Update Portfolio Entry", "portfolioentry");
        seedPermission("portfolioentry:delete", "Delete Portfolio Entry", "portfolioentry");

        // Tasks & Notes
        seedPermission("task:read", "View Task", "task");
        seedPermission("task:create", "Create Task", "task");
        seedPermission("task:update", "Update Task", "task");
        seedPermission("task:delete", "Delete Task", "task");

        seedPermission("note:read", "View Note", "note");
        seedPermission("note:create", "Create Note", "note");
        seedPermission("note:update", "Update Note", "note");
        seedPermission("note:delete", "Delete Note", "note");

        // User Management: Users, Groups, Roles
        seedPermission("user:read", "View User", "user");
        seedPermission("user:create", "Create User", "user");
        seedPermission("user:update", "Update User", "user");
        seedPermission("user:delete", "Delete User", "user");

        seedPermission("userprofile:read", "View User Profile", "userprofile");

        seedPermission("crmgroup:read", "View CRM Group", "crmgroup");
        seedPermission("crmgroup:create", "Create CRM Group", "crmgroup");
        seedPermission("crmgroup:update", "Update CRM Group", "crmgroup");
        seedPermission("crmgroup:delete", "Delete CRM Group", "crmgroup");

        seedPermission("role:read", "View Role", "role");
        seedPermission("role:create", "Create Role", "role");
        seedPermission("role:update", "Update Role", "role");
        seedPermission("role:delete", "Delete Role", "role");

        seedPermission("rolepermission:read", "View Role Permission", "rolepermission");
        seedPermission("rolepermission:create", "Create Role Permission", "rolepermission");
        seedPermission("rolepermission:update", "Update Role Permission", "rolepermission");
        seedPermission("rolepermission:delete", "Delete Role Permission", "rolepermission");
    }

    private void seedPermission(String name, String displayName, String resource) {
        permissionService.getOrCreate(name, displayName, resource);
    }
}
