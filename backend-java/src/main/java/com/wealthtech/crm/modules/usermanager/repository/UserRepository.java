package com.wealthtech.crm.modules.usermanager.repository;

import com.wealthtech.crm.modules.usermanager.entity.Role;
import com.wealthtech.crm.modules.usermanager.entity.User;

import java.util.*;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // Need the user's role, permissions for that role, and group for that role when Spring Security authenticates a user
    @EntityGraph(attributePaths = {"role", "role.permissions", "group"})
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    

}
