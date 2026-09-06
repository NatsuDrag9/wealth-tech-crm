package com.wealthtech.crm.modules.usermanager.repository;

import com.wealthtech.crm.modules.usermanager.entity.Permission;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long> {
    Optional<Permission> findByCodename(String codename);

    List<Permission> findAllByOrderByIdAsc();
}
