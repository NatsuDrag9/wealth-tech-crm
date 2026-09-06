package com.wealthtech.crm.modules.usermanager.repository;

import com.wealthtech.crm.modules.usermanager.entity.User;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    @EntityGraph(attributePaths = {"role", "role.permissions", "group"})
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByGroupId(Long groupId);

    @Query("SELECT u FROM User u WHERE u.id > :cursor ORDER BY u.id ASC")
    List<User> findByIdGreaterThanOrderByIdAsc(@Param("cursor") Long cursor, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT u FROM User u WHERE (:search IS NULL OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%'))) AND u.id > :cursor ORDER BY u.id ASC")
    List<User> searchByIdGreaterThanOrderByIdAsc(@Param("search") String search, @Param("cursor") Long cursor, org.springframework.data.domain.Pageable pageable);
}
