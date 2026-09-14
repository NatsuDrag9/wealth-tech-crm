package com.wealthtech.crm.modules.usermanager.service;

import java.util.HashSet;
import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.wealthtech.crm.modules.usermanager.entity.Group;
import com.wealthtech.crm.modules.usermanager.entity.Permission;
import com.wealthtech.crm.modules.usermanager.entity.Role;
import com.wealthtech.crm.modules.usermanager.entity.User;
import com.wealthtech.crm.modules.usermanager.repository.GroupRepository;
import com.wealthtech.crm.modules.usermanager.repository.PermissionRepository;
import com.wealthtech.crm.modules.usermanager.repository.RoleRepository;
import com.wealthtech.crm.modules.usermanager.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Bootstraps the platform ADMIN role, assigns all system authorities/permissions,
 * and ensures a default super-administrator user exists.
 */
@Component
@Order(2)
@RequiredArgsConstructor
@Slf4j
public class AdminRoleSeeder implements CommandLineRunner {

    private final GroupRepository groupRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        // 1. Ensure Administration Group exists
        Group adminGroup = groupRepository.findByName("Administration")
                .orElseGet(() -> groupRepository.save(
                        Group.builder()
                                .name("Administration")
                                .description("System & Platform Administration")
                                .createdBy(1L)
                                .build()
                ));

        // 2. Ensure ADMIN Role exists under Administration Group
        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseGet(() -> roleRepository.save(
                        Role.builder()
                                .name("ADMIN")
                                .description("System Administrator with complete platform governance access")
                                .group(adminGroup)
                                .createdBy(1L)
                                .build()
                ));

        // 3. Grant ALL system permissions to ADMIN role
        List<Permission> allPermissions = permissionRepository.findAll();
        adminRole.setPermissions(new HashSet<>(allPermissions));
        roleRepository.save(adminRole);
        log.info("Assigned {} platform permissions to ADMIN role", allPermissions.size());

        // 4. Ensure default administrator user exists
        if (userRepository.findByEmail("admin@wealthtech.crm").isEmpty()) {
            User adminUser = User.builder()
                    .email("admin@wealthtech.crm")
                    .password(passwordEncoder.encode("Admin@123"))
                    .firstName("System")
                    .lastName("Administrator")
                    .group(adminGroup)
                    .role(adminRole)
                    .createdBy(1L)
                    .languages(List.of("English"))
                    .build();

            userRepository.save(adminUser);
            log.info("Bootstrapped default system administrator: admin@wealthtech.crm");
        }
    }
}
