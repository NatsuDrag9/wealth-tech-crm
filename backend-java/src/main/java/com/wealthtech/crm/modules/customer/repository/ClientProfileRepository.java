package com.wealthtech.crm.modules.customer.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.wealthtech.crm.modules.customer.entity.ClientProfile;

@Repository 
public interface ClientProfileRepository extends JpaRepository<ClientProfile, Long> {
    Optional<ClientProfile> findByClientId(Long clientId);

    boolean existsByClientId(Long clientId);
}
