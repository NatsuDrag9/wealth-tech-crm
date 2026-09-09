package com.wealthtech.crm.modules.riskappetite.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.wealthtech.crm.modules.riskappetite.entity.RiskQuestion;

@Repository
public interface RaQuestionRepository extends JpaRepository<RiskQuestion, Long> {
    List<RiskQuestion> findAllByOrderByDisplayOrderAsc();
}
