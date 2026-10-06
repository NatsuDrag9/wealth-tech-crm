package com.wealthtech.crm.modules.portfolioreview.eval.model;

import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Spring AI compatible evaluation response containing pass status, numerical score, feedback, and metadata.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationResponse {
    private boolean pass;
    private float score;
    private String feedback;
    private Map<String, Object> metadata;
}
