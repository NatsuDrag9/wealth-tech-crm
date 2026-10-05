package com.wealthtech.crm.modules.portfolioreview.service;

import java.util.Locale;

import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

/**
 * Service for refining natural-language search queries when initial RAG retrieval
 * fails the Evidence Quality Gate threshold.
 * Reformulates conversational queries into canonical mutual fund entity and document terms.
 */
@Service
@Slf4j
public class RagQueryRefinerService {

    public record RefinedQueryResult(
            String originalQuery,
            String refinedQuery,
            boolean wasRefined,
            String refinementStrategy
    ) {}

    /**
     * Reformulates a query to maximize semantic and lexical overlap with official fund disclosures.
     *
     * @param originalQuery user's original query
     * @return RefinedQueryResult containing the enhanced search string
     */
    public RefinedQueryResult refineQuery(String originalQuery) {
        if (originalQuery == null || originalQuery.isBlank()) {
            return new RefinedQueryResult(originalQuery, "", false, "NONE");
        }

        String lower = originalQuery.toLowerCase(Locale.ROOT);
        StringBuilder refined = new StringBuilder(originalQuery.trim());
        String strategy;

        if (lower.contains("cost") || lower.contains("fee") || lower.contains("expense") || lower.contains("ter")) {
            refined.append(" Total Expense Ratio TER Direct Plan Regular Plan expense disclosure");
            strategy = "EXPENSE_RATIO_EXPANSION";
        } else if (lower.contains("risk") || lower.contains("safe") || lower.contains("volatile") || lower.contains("danger")) {
            refined.append(" Riskometer Product Labeling SEBI risk band suitability");
            strategy = "RISKOMETER_EXPANSION";
        } else if (lower.contains("sector") || lower.contains("holding") || lower.contains("stock") || lower.contains("company")) {
            refined.append(" portfolio holdings sector allocation top 10 assets factsheet");
            strategy = "HOLDINGS_PORTFOLIO_EXPANSION";
        } else if (lower.contains("hybrid") || lower.contains("conservative") || lower.contains("debt")) {
            refined.append(" Parag Parikh Conservative Hybrid Fund asset allocation debt equity SID");
            strategy = "HYBRID_SCHEME_EXPANSION";
        } else if (lower.contains("tax") || lower.contains("elss") || lower.contains("80c")) {
            refined.append(" Parag Parikh ELSS Tax Saver Fund 3 year lock-in equity SID");
            strategy = "ELSS_TAX_EXPANSION";
        } else {
            refined.append(" mutual fund factsheet Scheme Information Document SID disclosure");
            strategy = "GENERAL_CANONICAL_EXPANSION";
        }

        String finalQuery = refined.toString();
        log.info("Query Refinement applied [{}]: '{}' -> '{}'", strategy, originalQuery, finalQuery);

        return new RefinedQueryResult(originalQuery, finalQuery, true, strategy);
    }
}
