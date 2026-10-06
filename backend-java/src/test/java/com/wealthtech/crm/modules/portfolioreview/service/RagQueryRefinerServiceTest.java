package com.wealthtech.crm.modules.portfolioreview.service;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RagQueryRefinerServiceTest {

    private RagQueryRefinerService refinerService;

    @BeforeEach
    void setUp() {
        refinerService = new RagQueryRefinerService();
    }

    @Test
    @DisplayName("Should expand expense ratio queries with canonical TER keywords")
    void testExpenseRatioExpansion() {
        RagQueryRefinerService.RefinedQueryResult result = refinerService.refineQuery("What is the fee of HDFC fund?");

        assertThat(result.wasRefined()).isTrue();
        assertThat(result.refinementStrategy()).isEqualTo("EXPENSE_RATIO_EXPANSION");
        assertThat(result.refinedQuery()).contains("Total Expense Ratio TER");
    }

    @Test
    @DisplayName("Should expand risk queries with Riskometer keywords")
    void testRiskometerExpansion() {
        RagQueryRefinerService.RefinedQueryResult result = refinerService.refineQuery("Is this fund safe or volatile?");

        assertThat(result.wasRefined()).isTrue();
        assertThat(result.refinementStrategy()).isEqualTo("RISKOMETER_EXPANSION");
        assertThat(result.refinedQuery()).contains("Riskometer Product Labeling");
    }

    @Test
    @DisplayName("Should expand holding and sector queries with portfolio keywords")
    void testHoldingsExpansion() {
        RagQueryRefinerService.RefinedQueryResult result = refinerService.refineQuery("Which top stocks are in this scheme?");

        assertThat(result.wasRefined()).isTrue();
        assertThat(result.refinementStrategy()).isEqualTo("HOLDINGS_PORTFOLIO_EXPANSION");
        assertThat(result.refinedQuery()).contains("portfolio holdings sector allocation");
    }

    @Test
    @DisplayName("Should handle empty or blank query safely without refinement")
    void testEmptyQueryHandling() {
        RagQueryRefinerService.RefinedQueryResult result = refinerService.refineQuery("");
        assertThat(result.wasRefined()).isFalse();

        RagQueryRefinerService.RefinedQueryResult nullResult = refinerService.refineQuery(null);
        assertThat(nullResult.wasRefined()).isFalse();
    }
}
