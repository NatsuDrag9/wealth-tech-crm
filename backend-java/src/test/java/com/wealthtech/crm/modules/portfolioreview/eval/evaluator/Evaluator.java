package com.wealthtech.crm.modules.portfolioreview.eval.evaluator;

import com.wealthtech.crm.modules.portfolioreview.eval.model.EvaluationRequest;
import com.wealthtech.crm.modules.portfolioreview.eval.model.EvaluationResponse;

/**
 * Standard evaluator interface mirroring the org.springframework.ai.evaluation.Evaluator contract.
 */
public interface Evaluator {
    EvaluationResponse evaluate(EvaluationRequest evaluationRequest);
}
