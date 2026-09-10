package com.wealthtech.crm.modules.customer.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.wealthtech.crm.modules.customer.entity.Client;
import com.wealthtech.crm.modules.usermanager.entity.User;
import com.wealthtech.crm.modules.customer.enums.ClientStatus;

@Repository 
public interface ClientRepository extends JpaRepository<Client, Long> {
    
    // Single client eager loading RM and Profile
    @Query ("SELECT c FROM Client c" + 
    " LEFT JOIN FETCH c.relationshipManager" +
    " LEFT JOIN FETCH c.profile " +
    "WHERE c.id = :id"
    )
    Optional<Client> findByIdWithRelations(@Param ("id") Long id);

    // Uniqueness and validation lookups
    Optional<Client> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByPan(String pan);
    boolean existsByPhone(String phone);

    // Cursor based pagination
    @Query("""
            SELECT c FROM Client c
            LEFT JOIN FETCH c.relationshipManager
            LEFT JOIN FETCH c.profile
            WHERE (:status IS NULL OR c.status = :status)
                AND (:rmId is NULL OR c.relationshipManager.id = :rmId)
            AND (:search IS NULL OR (
                LOWER(c.firstName) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(c.lastName) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(c.phone) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(c.pan) LIKE LOWER(CONCAT('%', :search, '%'))
                )
            )
            AND c.id > :cursor
            ORDER BY c.id ASC
        """
    )
    List<Client> findWithFilters(
        @Param("status") ClientStatus status,
        @Param("rmId") Long rmId,
        @Param("search") String search,
        @Param("cursor") Long cursor,
        Pageable pageable
    );

    // Count matching active filters (for frontend totalSize metadata)
    @Query("""
            SELECT COUNT(c) FROM Client c
            WHERE (:status IS NULL OR c.status = :status)
            AND (:rmId IS NULL OR c.relationshipManager.id = :rmId)
            AND (:search IS NULL OR (
                LOWER(c.firstName) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(c.lastName) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(c.email) LIKE LOWER(CONCAT('%',  :search, '%'))
                OR LOWER(c.phone) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(c.pan) LIKE LOWER(CONCAT('%', :search, '%'))
    ))
     """)
     long countWithFilters(
        @Param("status") ClientStatus status,
        @Param("rmId") Long rmId,
        @Param("search") String search
     );

    // Atomic bulk RM re-assignment in  a single DB round-trip
    @Modifying 
    @Query(
        """
            UPDATE Client c 
            SET c.relationshipManager = :newRm, c.updatedAt = CURRENT_TIMESTAMP
            WHERE c.id IN :clientIds
        """
    )
    int bulkReassignRm(@Param("clientIds") List<Long> clientIds, @Param("newRm") User newRm);
}
