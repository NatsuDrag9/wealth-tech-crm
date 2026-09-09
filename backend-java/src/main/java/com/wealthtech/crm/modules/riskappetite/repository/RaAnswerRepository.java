package com.wealthtech.crm.modules.riskappetite.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.wealthtech.crm.modules.riskappetite.entity.RiskAnswer;

@Repository
public interface RaAnswerRepository extends JpaRepository<RiskAnswer, Long> {
    Optional<RiskAnswer> findByAssessmentIdAndQuestionId(Long assessmentId, Long questionId);
    List<RiskAnswer> findByAssessmentId(Long assessmentId);
}