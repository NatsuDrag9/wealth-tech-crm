package com.wealthtech.crm.modules.agent.tool.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.wealthtech.crm.modules.agent.tool.AgentTool;
import com.wealthtech.crm.modules.agent.tool.AgentToolResult;
import com.wealthtech.crm.modules.portfolioreview.dto.PortfolioReviewResponse;
import com.wealthtech.crm.modules.portfolioreview.service.PortfolioReviewService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class PortfolioReviewTool implements AgentTool {

    private final PortfolioReviewService reviewService;

    @Override
    public String getName() {
        return "get_portfolio_review";
    }

    @Override
    public String getDescription() {
        return "Retrieves the client's latest portfolio review, current holdings, valuation, and SELL/HOLD action tags.";
    }

    @Override
    public Map<String, Object> getParameterSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.of(
                        "client_id", Map.of(
                                "type", "integer",
                                "description", "The unique client ID"
                        ),
                        "review_id", Map.of(
                                "type", "integer",
                                "description", "Optional specific review ID"
                        )
                ),
                "required", List.of("client_id")
        );
    }

    @Override
    public AgentToolResult execute(Map<String, Object> parameters) {
        try {
            Object rawClientId = parameters.get("client_id");
            if (rawClientId == null) {
                return AgentToolResult.error("Parameter 'client_id' is required.");
            }
            Long clientId = Long.valueOf(rawClientId.toString());

            PortfolioReviewResponse review;
            Object rawReviewId = parameters.get("review_id");
            if (rawReviewId != null && !rawReviewId.toString().isBlank()) {
                review = reviewService.getReview(Long.valueOf(rawReviewId.toString()));
            } else {
                review = reviewService.getLatestReview(clientId);
            }

            Map<String, Object> data = new HashMap<>();
            data.put("review_id", review.id());
            data.put("status", review.status());
            data.put("total_invested", review.totalInvested());
            data.put("total_current_value", review.totalCurrentValue());
            data.put("total_gain", review.totalGain());
            data.put("gain_percentage", review.gainPercentage());

            List<Map<String, Object>> entriesList = review.entries().stream()
                    .map(e -> {
                        Map<String, Object> item = new HashMap<>();
                        item.put("id", e.id());
                        item.put("fund_name", e.fundName());
                        item.put("isin", e.isin());
                        item.put("current_value", e.currentValue());
                        item.put("action", e.action());
                        item.put("abs_return_pct", e.absReturnPct());
                        return item;
                    })
                    .toList();
            data.put("holdings", entriesList);

            long sellCount = review.entries().stream().filter(e -> "SELL".equalsIgnoreCase(e.action())).count();
            String summary = String.format("Review #%d: Total Value ₹%s across %d holdings (%d marked SELL).",
                    review.id(), review.totalCurrentValue(), review.entries().size(), sellCount);

            return AgentToolResult.success(data, summary);
        } catch (Exception e) {
            log.error("Error executing PortfolioReviewTool: {}", e.getMessage(), e);
            return AgentToolResult.error("Failed to retrieve portfolio review: " + e.getMessage());
        }
    }
}
