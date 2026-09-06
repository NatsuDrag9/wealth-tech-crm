package com.wealthtech.crm.modules.usermanager.repository;

import com.wealthtech.crm.modules.usermanager.entity.Group;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupRepository extends JpaRepository<Group, Long> {
    boolean existsByName(String name);

    @Query("SELECT g FROM Group g WHERE g.id > :cursor ORDER BY g.id ASC")
    List<Group> findByIdGreaterThanOrderByIdAsc(@Param("cursor") Long cursor, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT g FROM Group g WHERE (:search IS NULL OR LOWER(g.name) LIKE LOWER(CONCAT('%', :search, '%'))) AND g.id > :cursor ORDER BY g.id ASC")
    List<Group> searchByIdGreaterThanOrderByIdAsc(@Param("search") String search, @Param("cursor") Long cursor, org.springframework.data.domain.Pageable pageable);
}
