package com.wealthtech.crm.modules.portfolioreview.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.wealthtech.crm.modules.portfolioreview.entity.RecommendationFundItem;

@Repository 
public interface RecommendationFundItemRepository extends JpaRepository<RecommendationFundItem, Long> {
    
    List<RecommendationFundItem> findByRecommendationIdOrderByDisplayOrderAsc(Long recommendationId);
}
