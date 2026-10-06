package com.wealthtech.crm.modules.portfolioreview.eval.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Spring AI compatible evaluation request bundling the user query, context evidence, and synthesized response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationRequest {
    private String userText;
    private List<String> contextList;
    private String responseContent;
}
