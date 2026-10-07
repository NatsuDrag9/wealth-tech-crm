package com.wealthtech.crm.modules.agent.tool.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.wealthtech.crm.modules.agent.tool.AgentTool;
import com.wealthtech.crm.modules.agent.tool.AgentToolResult;
import com.wealthtech.crm.modules.portfolioreview.dto.EligibleFundResponse;
import com.wealthtech.crm.modules.portfolioreview.service.PortfolioReviewService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class EligibleFundsTool implements AgentTool {

    private final PortfolioReviewService reviewService;

    @Override
    public String getName() {
        return "get_eligible_funds";
    }

    @Override
    public String getDescription() {
        return "Fetches curated and approved mutual funds filtered by risk category code (e.g. MODERATE, AGGRESSIVE, CONSERVATIVE).";
    }

    @Override
    public Map<String, Object> getParameterSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.of(
                        "category_code", Map.of(
                                "type", "string",
                                "description", "Score category code such as CONSERVATIVE, MODERATE_CONSERVATIVE, MODERATE, AGGRESSIVE, VERY_AGGRESSIVE"
                        )
                ),
                "required", List.of("category_code")
        );
    }

    @Override
    public AgentToolResult execute(Map<String, Object> parameters) {
        try {
            Object rawCategory = parameters.get("category_code");
            String categoryCode = rawCategory != null ? rawCategory.toString().trim() : null;

            List<EligibleFundResponse> funds = reviewService.getEligibleFunds(categoryCode);

            List<Map<String, Object>> fundItems = funds.stream()
                    .map(f -> {
                        Map<String, Object> m = new HashMap<>();
                        m.put("id", f.id());
                        m.put("fund_name", f.fundName());
                        m.put("isin", f.isin());
                        m.put("category_name", f.scoreCategory() != null ? f.scoreCategory() : "");
                        return m;
                    })
                    .toList();

            Map<String, Object> data = Map.of("funds", fundItems, "count", fundItems.size());
            String summary = String.format("Found %d eligible approved funds for category '%s'.",
                    fundItems.size(), categoryCode != null ? categoryCode : "ALL");

            return AgentToolResult.success(data, summary);
        } catch (Exception e) {
            log.error("Error executing EligibleFundsTool: {}", e.getMessage(), e);
            return AgentToolResult.error("Failed to fetch eligible funds: " + e.getMessage());
        }
    }
}
