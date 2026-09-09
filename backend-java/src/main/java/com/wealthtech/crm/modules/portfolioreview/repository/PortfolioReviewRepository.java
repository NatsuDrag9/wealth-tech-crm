package com.wealthtech.crm.modules.portfolioreview.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.wealthtech.crm.modules.portfolioreview.entity.PortfolioReview;

@Repository
public interface PortfolioReviewRepository extends JpaRepository<PortfolioReview, Long> {
    
    // Fetch the client's latest portfolio review record
    Optional<PortfolioReview> findTopByClientIdOrderByCreatedAtDesc(Long clientId);

    // Full review history of a client
    List<PortfolioReview> findByClientIdOrderByCreatedAtDesc(Long clientId);
}
