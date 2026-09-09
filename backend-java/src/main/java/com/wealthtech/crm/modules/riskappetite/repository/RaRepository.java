package com.wealthtech.crm.modules.riskappetite.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.wealthtech.crm.modules.riskappetite.entity.RiskAssessment;
import com.wealthtech.crm.modules.riskappetite.enums.AssessmentStatus;

@Repository
public interface RaRepository extends JpaRepository<RiskAssessment, Long> {

    // Latest completed assessment (required for Portfolio Review gate)
    Optional<RiskAssessment> findTopByClientIdAndStatusOrderByCompletedAtDesc(Long clientId, AssessmentStatus status);

    // Latest in-progress assessment (required for Risk-Assessment screen)
    Optional<RiskAssessment> findTopByClientIdAndStatusOrderByCreatedAtDesc(Long clientId, AssessmentStatus status);
}