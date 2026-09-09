
package com.wealthtech.crm.modules.riskappetite.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.wealthtech.crm.modules.riskappetite.entity.RiskOption;

public interface RaOptionRepository extends JpaRepository<RiskOption, Long> {
    List<RiskOption> findByQuestionIdOrderByOptionLetterAsc(Long questionId);
}