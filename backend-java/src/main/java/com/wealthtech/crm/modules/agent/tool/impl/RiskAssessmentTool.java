package com.wealthtech.crm.modules.agent.tool.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.wealthtech.crm.modules.agent.tool.AgentTool;
import com.wealthtech.crm.modules.agent.tool.AgentToolResult;
import com.wealthtech.crm.modules.riskappetite.dto.RaResultResponse;
import com.wealthtech.crm.modules.riskappetite.service.RaService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class RiskAssessmentTool implements AgentTool {

    private final RaService raService;

    @Override
    public String getName() {
        return "get_risk_assessment";
    }

    @Override
    public String getDescription() {
        return "Fetches the latest completed SEBI risk assessment and score category (e.g. MODERATE, AGGRESSIVE) for a client.";
    }

    @Override
    public Map<String, Object> getParameterSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.of(
                        "client_id", Map.of(
                                "type", "integer",
                                "description", "The unique client ID"
                        )
                ),
                "required", List.of("client_id")
        );
    }

    @Override
    public AgentToolResult execute(Map<String, Object> parameters) {
        try {
            Object rawId = parameters.get("client_id");
            if (rawId == null) {
                return AgentToolResult.error("Parameter 'client_id' is required.");
            }
            Long clientId = Long.valueOf(rawId.toString());
            RaResultResponse response = raService.getLatestCompletedAssessment(clientId);

            Map<String, Object> data = new HashMap<>();
            data.put("assessment_id", response.id());
            data.put("client_id", response.clientId());
            data.put("status", response.status());
            data.put("total_score", response.totalScore());
            if (response.scoreCategory() != null) {
                data.put("category_code", response.scoreCategory().code());
                data.put("category_name", response.scoreCategory().displayName());
            }

            String categoryName = response.scoreCategory() != null ? response.scoreCategory().displayName() : "UNKNOWN";
            String summary = String.format("Risk Assessment #%d: Score %d, Category: %s",
                    response.id(), response.totalScore(), categoryName);

            return AgentToolResult.success(data, summary);
        } catch (Exception e) {
            log.error("Error executing RiskAssessmentTool: {}", e.getMessage(), e);
            return AgentToolResult.error("Failed to retrieve risk assessment: " + e.getMessage());
        }
    }
}
