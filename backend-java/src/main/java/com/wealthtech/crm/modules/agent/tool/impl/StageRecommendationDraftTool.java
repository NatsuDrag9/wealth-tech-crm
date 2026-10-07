package com.wealthtech.crm.modules.agent.tool.impl;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.wealthtech.crm.modules.agent.tool.AgentTool;
import com.wealthtech.crm.modules.agent.tool.AgentToolResult;
import com.wealthtech.crm.modules.portfolioreview.dto.CreateRecommendationRequest;
import com.wealthtech.crm.modules.portfolioreview.dto.PortfolioRecommendationResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.RfItemRequest;
import com.wealthtech.crm.modules.portfolioreview.service.PortfolioReviewService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class StageRecommendationDraftTool implements AgentTool {

    private final PortfolioReviewService reviewService;

    @Override
    public String getName() {
        return "stage_recommendation_proposal";
    }

    @Override
    public String getDescription() {
        return "Stages a compliant investment recommendation proposal (REPLACE_FUNDS or NEW_PORTFOLIO) in SAVED status for RM review.";
    }

    @Override
    public Map<String, Object> getParameterSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.of(
                        "client_id", Map.of(
                                "type", "integer",
                                "description", "Client ID"
                        ),
                        "portfolio_review_id", Map.of(
                                "type", "integer",
                                "description", "Portfolio Review ID (required for REPLACE_FUNDS)"
                        ),
                        "flow_type", Map.of(
                                "type", "string",
                                "description", "REPLACE_FUNDS or NEW_PORTFOLIO"
                        ),
                        "funds", Map.of(
                                "type", "array",
                                "items", Map.of(
                                        "type", "object",
                                        "properties", Map.of(
                                                "eligible_fund_id", Map.of("type", "integer"),
                                                "amount", Map.of("type", "number"),
                                                "replaces_entry_id", Map.of("type", "integer"),
                                                "display_order", Map.of("type", "integer")
                                        ),
                                        "required", List.of("eligible_fund_id", "amount")
                                )
                        )
                ),
                "required", List.of("client_id", "flow_type", "funds")
        );
    }

    @Override
    @SuppressWarnings("unchecked")
    public AgentToolResult execute(Map<String, Object> parameters) {
        try {
            Long clientId = Long.valueOf(parameters.get("client_id").toString());
            String flowType = parameters.get("flow_type").toString().trim().toUpperCase();

            Long reviewId = null;
            if (parameters.get("portfolio_review_id") != null && !parameters.get("portfolio_review_id").toString().isBlank()) {
                reviewId = Long.valueOf(parameters.get("portfolio_review_id").toString());
            }

            List<RfItemRequest> items = new ArrayList<>();
            Object rawFunds = parameters.get("funds");
            if (rawFunds instanceof List<?> fundList) {
                int order = 1;
                for (Object itemObj : fundList) {
                    if (itemObj instanceof Map<?, ?> itemMap) {
                        Long fundId = Long.valueOf(itemMap.get("eligible_fund_id").toString());
                        BigDecimal amount = new BigDecimal(itemMap.get("amount").toString());

                        Long replacesEntryId = null;
                        if (itemMap.get("replaces_entry_id") != null && !itemMap.get("replaces_entry_id").toString().isBlank()) {
                            replacesEntryId = Long.valueOf(itemMap.get("replaces_entry_id").toString());
                        }

                        Integer displayOrder = itemMap.get("display_order") != null
                                ? Integer.valueOf(itemMap.get("display_order").toString())
                                : order++;

                        items.add(new RfItemRequest(fundId, amount, replacesEntryId, displayOrder));
                    }
                }
            }

            if (items.isEmpty()) {
                return AgentToolResult.error("Recommendation proposal requires at least one fund allocation.");
            }

            CreateRecommendationRequest request = new CreateRecommendationRequest(
                    clientId,
                    reviewId,
                    flowType,
                    items
            );

            PortfolioRecommendationResponse response = reviewService.createRecommendation(request);

            BigDecimal totalAmount = items.stream()
                    .map(RfItemRequest::amount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Map<String, Object> data = new HashMap<>();
            data.put("recommendation_id", response.id());
            data.put("status", response.status());
            data.put("flow_type", response.flowType());
            data.put("total_amount", totalAmount);
            data.put("funds_count", response.funds() != null ? response.funds().size() : 0);
            data.put("response_object", response);

            String summary = String.format("Proposal #%d staged successfully (Status: %s, Flow: %s, Total: ₹%s across %d items).",
                    response.id(), response.status(), response.flowType(), totalAmount,
                    response.funds() != null ? response.funds().size() : 0);

            return AgentToolResult.success(data, summary);
        } catch (Exception e) {
            log.error("Error executing StageRecommendationDraftTool: {}", e.getMessage(), e);
            return AgentToolResult.error("Failed to stage recommendation proposal: " + e.getMessage());
        }
    }
}
