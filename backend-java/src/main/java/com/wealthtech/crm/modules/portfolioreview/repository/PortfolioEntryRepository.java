package com.wealthtech.crm.modules.portfolioreview.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.wealthtech.crm.modules.portfolioreview.entity.PortfolioEntry;

@Repository 
public interface PortfolioEntryRepository extends JpaRepository<PortfolioEntry, Long> {
    // Individual fund records belonging to a portfolio review record
    List<PortfolioEntry> findByPortfolioReviewId(Long portfolioReviewId);
}
