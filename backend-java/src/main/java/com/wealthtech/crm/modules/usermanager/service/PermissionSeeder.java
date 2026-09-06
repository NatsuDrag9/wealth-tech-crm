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

        seedPermission("view_client", "View Client", "client");
        seedPermission("view_clientprofile", "View Client Profile", "clientprofile");
        seedPermission("view_riskappetite", "View Risk Appetite", "riskappetite");
        seedPermission("view_portfolioreview", "View Portfolio Review", "portfolioreview");
        seedPermission("view_portfolioentry", "View Portfolio Entry", "portfolioentry");
        seedPermission("view_task", "View Task", "task");
        seedPermission("view_note", "View Note", "note");
        seedPermission("view_userprofile", "View User Profile", "userprofile");
        seedPermission("view_user", "View User", "user");
        seedPermission("view_crmgroup", "View CRM Group", "crmgroup");
        seedPermission("view_role", "View Role", "role");
        seedPermission("view_rolepermission", "View Role Permission", "rolepermission");
        seedPermission("add_client", "Add Client", "client");
        seedPermission("change_client", "Change Client", "client");
        seedPermission("delete_client", "Delete Client", "client");
        seedPermission("add_clientprofile", "Add Client Profile", "clientprofile");
        seedPermission("change_clientprofile", "Change Client Profile", "clientprofile");
        seedPermission("delete_clientprofile", "Delete Client Profile", "clientprofile");
        seedPermission("add_riskappetite", "Add Risk Appetite", "riskappetite");
        seedPermission("change_riskappetite", "Change Risk Appetite", "riskappetite");
        seedPermission("delete_riskappetite", "Delete Risk Appetite", "riskappetite");
        seedPermission("add_portfolioreview", "Add Portfolio Review", "portfolioreview");
        seedPermission("change_portfolioreview", "Change Portfolio Review", "portfolioreview");
        seedPermission("delete_portfolioreview", "Delete Portfolio Review", "portfolioreview");
        seedPermission("add_portfolioentry", "Add Portfolio Entry", "portfolioentry");
        seedPermission("change_portfolioentry", "Change Portfolio Entry", "portfolioentry");
        seedPermission("delete_portfolioentry", "Delete Portfolio Entry", "portfolioentry");
        seedPermission("add_task", "Add Task", "task");
        seedPermission("change_task", "Change Task", "task");
        seedPermission("delete_task", "Delete Task", "task");
        seedPermission("add_note", "Add Note", "note");
        seedPermission("change_note", "Change Note", "note");
        seedPermission("delete_note", "Delete Note", "note");
        seedPermission("add_crmgroup", "Add CRM Group", "crmgroup");
        seedPermission("change_crmgroup", "Change CRM Group", "crmgroup");
        seedPermission("delete_crmgroup", "Delete CRM Group", "crmgroup");
        seedPermission("add_role", "Add Role", "role");
        seedPermission("change_role", "Change Role", "role");
        seedPermission("delete_role", "Delete Role", "role");
        seedPermission("add_rolepermission", "Add Role Permission", "rolepermission");
        seedPermission("change_rolepermission", "Change Role Permission", "rolepermission");
        seedPermission("delete_rolepermission", "Delete Role Permission", "rolepermission");
        seedPermission("add_user", "Add User", "user");
        seedPermission("change_user", "Change User", "user");
        seedPermission("delete_user", "Delete User", "user");
    }

    private void seedPermission(String codename, String name, String contentType) {
        permissionService.getOrCreate(codename, name, contentType);
    }
}
