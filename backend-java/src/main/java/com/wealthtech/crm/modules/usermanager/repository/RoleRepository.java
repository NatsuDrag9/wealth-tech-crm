package com.wealthtech.crm.modules.usermanager.repository;

import com.wealthtech.crm.modules.usermanager.entity.Role;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    boolean existsByGroupIdAndName(Long groupId, String name);

    Optional<Role> findByName(String name);

    List<Role> findByGroupId(Long groupId);

    @Query("SELECT r FROM Role r WHERE r.id > :cursor ORDER BY r.id ASC")
    List<Role> findByIdGreaterThanOrderByIdAsc(@Param("cursor") Long cursor, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT r FROM Role r WHERE r.group.id = :groupId AND r.id > :cursor ORDER BY r.id ASC")
    List<Role> findByGroupIdAndIdGreaterThanOrderByIdAsc(@Param("groupId") Long groupId, @Param("cursor") Long cursor, org.springframework.data.domain.Pageable pageable);
}
