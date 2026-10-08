package com.wealthtech.crm.modules.agent.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.wealthtech.crm.modules.agent.enums.AgentMode;

import jakarta.validation.constraints.NotNull;

public record AgentRunRequest(
        @NotNull(message = "Client ID is required")
        @JsonProperty("client_id")
        @JsonAlias("clientId")
        Long clientId,

        @JsonProperty("portfolio_review_id")
        @JsonAlias("portfolioReviewId")
        Long portfolioReviewId,

        @JsonProperty("flow_type")
        @JsonAlias("flowType")
        String flowType,

        @JsonProperty("user_goal")
        @JsonAlias("userGoal")
        String userGoal,

        @JsonProperty("review_feedback")
        @JsonAlias("reviewFeedback")
        String reviewFeedback,

        @JsonProperty("previous_proposal_id")
        @JsonAlias("previousProposalId")
        Long previousProposalId,

        @JsonProperty("agent_mode")
        @JsonAlias("agentMode")
        AgentMode agentMode,

        @JsonProperty("conversation_id")
        @JsonAlias("conversationId")
        String conversationId
) {
    public AgentRunRequest(
            Long clientId,
            Long portfolioReviewId,
            String flowType,
            String userGoal,
            AgentMode agentMode,
            String conversationId
    ) {
        this(clientId, portfolioReviewId, flowType, userGoal, null, null, agentMode, conversationId);
    }

    public AgentMode resolvedAgentMode() {
        return agentMode != null ? agentMode : AgentMode.VANILLA;
    }

    public String resolvedFlowType() {
        return (flowType != null && !flowType.isBlank()) ? flowType.trim().toUpperCase() : "REPLACE_FUNDS";
    }

    public String resolvedUserGoal() {
        if (reviewFeedback != null && !reviewFeedback.isBlank()) {
            return "The Relationship Manager reviewed the recommendation proposal and requested adjustments: "
                    + reviewFeedback.trim()
                    + ". Re-evaluate fund selection and adjust the staged recommendation proposal accordingly.";
        }
        if (userGoal != null && !userGoal.isBlank()) {
            return userGoal.trim();
        }
        return "Review client holdings, perform fund research, and construct compliant investment recommendation proposal.";
    }
}
