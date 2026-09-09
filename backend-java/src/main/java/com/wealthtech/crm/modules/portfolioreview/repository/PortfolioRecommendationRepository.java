package com.wealthtech.crm.modules.portfolioreview.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.wealthtech.crm.modules.portfolioreview.entity.PortfolioRecommendation;

@Repository 
public interface PortfolioRecommendationRepository extends JpaRepository<PortfolioRecommendation, Long> {
    
    // Recommendation history for client
    List<PortfolioRecommendation> findByClientIdOrderByCreatedAtDesc(Long clientId);

    // Scoped lookup to prevent one client from accessing another's recommendation
    Optional<PortfolioRecommendation> findByIdAndClientId(Long id, Long clientId);
}
