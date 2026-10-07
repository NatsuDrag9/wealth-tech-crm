package com.wealthtech.crm.modules.agent.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.wealthtech.crm.modules.agent.enums.AgentMode;
import com.wealthtech.crm.modules.portfolioreview.dto.PortfolioRecommendationResponse;

import java.util.List;
import java.util.Map;

public record AgentExecutionResult(
        boolean success,
        @JsonProperty("agent_mode")
        AgentMode agentMode,
        String summary,
        @JsonProperty("tool_steps")
        List<AgentStepRecord> toolSteps,
        @JsonProperty("staged_recommendation")
        PortfolioRecommendationResponse stagedRecommendation,
        @JsonProperty("telemetry")
        Map<String, Object> telemetry,
        @JsonProperty("error_message")
        String errorMessage
) {
    public static AgentExecutionResult success(
            AgentMode mode,
            String summary,
            List<AgentStepRecord> toolSteps,
            PortfolioRecommendationResponse stagedRecommendation,
            Map<String, Object> telemetry) {
        return new AgentExecutionResult(true, mode, summary, toolSteps, stagedRecommendation, telemetry, null);
    }

    public static AgentExecutionResult failure(
            AgentMode mode,
            String errorMessage,
            List<AgentStepRecord> toolSteps,
            Map<String, Object> telemetry) {
        return new AgentExecutionResult(false, mode, null, toolSteps, null, telemetry, errorMessage);
    }
}
