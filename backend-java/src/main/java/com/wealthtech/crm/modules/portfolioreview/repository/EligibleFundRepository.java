package com.wealthtech.crm.modules.portfolioreview.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.wealthtech.crm.modules.portfolioreview.entity.EligibleFund;
import com.wealthtech.crm.modules.riskappetite.enums.ScoreCategory;

@Repository
public interface EligibleFundRepository extends JpaRepository<EligibleFund, Long> {
    // Filter funds matching client's risk category that are currently active
    List<EligibleFund> findByScoreCategoryAndIsActiveTrue(ScoreCategory scoreCategory);

    // Used to avoid duplicate entries when ingesting funds
    Optional<EligibleFund> findByIsin(String isin);
}
