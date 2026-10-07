package com.wealthtech.crm.modules.agent.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.wealthtech.crm.modules.agent.enums.AgentMode;

import jakarta.validation.constraints.NotNull;

public record AgentRunRequest(
        @NotNull(message = "Client ID is required")
        @JsonProperty("client_id")
        Long clientId,

        @JsonProperty("portfolio_review_id")
        Long portfolioReviewId,

        @JsonProperty("flow_type")
        String flowType,

        @JsonProperty("user_goal")
        String userGoal,

        @JsonProperty("agent_mode")
        AgentMode agentMode,

        @JsonProperty("conversation_id")
        String conversationId
) {
    public AgentMode resolvedAgentMode() {
        return agentMode != null ? agentMode : AgentMode.VANILLA;
    }

    public String resolvedFlowType() {
        return (flowType != null && !flowType.isBlank()) ? flowType.trim().toUpperCase() : "REPLACE_FUNDS";
    }

    public String resolvedUserGoal() {
        if (userGoal != null && !userGoal.isBlank()) {
            return userGoal.trim();
        }
        return "Review client holdings, perform fund research, and construct compliant investment recommendation proposal.";
    }
}
