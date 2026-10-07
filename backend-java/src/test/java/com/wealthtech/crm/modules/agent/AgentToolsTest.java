package com.wealthtech.crm.modules.agent;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.wealthtech.crm.modules.agent.tool.AgentToolResult;
import com.wealthtech.crm.modules.agent.tool.impl.ClientProfileTool;
import com.wealthtech.crm.modules.agent.tool.impl.EligibleFundsTool;
import com.wealthtech.crm.modules.agent.tool.impl.FundResearchRagTool;
import com.wealthtech.crm.modules.agent.tool.impl.PortfolioReviewTool;
import com.wealthtech.crm.modules.agent.tool.impl.RiskAssessmentTool;
import com.wealthtech.crm.modules.agent.tool.impl.StageRecommendationDraftTool;
import com.wealthtech.crm.modules.customer.dto.ClientResponse;
import com.wealthtech.crm.modules.customer.service.ClientService;
import com.wealthtech.crm.modules.portfolioreview.dto.EligibleFundResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.PortfolioRecommendationResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.PortfolioReviewResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.RagQueryResponse;
import com.wealthtech.crm.modules.portfolioreview.service.PortfolioReviewService;
import com.wealthtech.crm.modules.portfolioreview.service.RagSynthesisService;
import com.wealthtech.crm.modules.riskappetite.dto.RaResultResponse;
import com.wealthtech.crm.modules.riskappetite.service.RaService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgentToolsTest {

    @Mock
    private ClientService clientService;

    @Mock
    private RaService raService;

    @Mock
    private PortfolioReviewService reviewService;

    @Mock
    private RagSynthesisService ragSynthesisService;

    @InjectMocks
    private ClientProfileTool clientProfileTool;

    @InjectMocks
    private RiskAssessmentTool riskAssessmentTool;

    @InjectMocks
    private PortfolioReviewTool portfolioReviewTool;

    @InjectMocks
    private EligibleFundsTool eligibleFundsTool;

    @InjectMocks
    private FundResearchRagTool fundResearchRagTool;

    @InjectMocks
    private StageRecommendationDraftTool stageRecommendationDraftTool;

    @Test
    @DisplayName("ClientProfileTool: should return client profile data on valid client_id")
    void testClientProfileToolSuccess() {
        ClientResponse response = new ClientResponse(
                1L, "Rahul", "Sharma", "Rahul Sharma",
                "rahul@example.com", "9876543210", "ABCDE1234F",
                null, "MALE", "ACTIVE", "VERIFIED", null, null, null
        );
        when(clientService.getClient(1L)).thenReturn(response);

        AgentToolResult result = clientProfileTool.execute(Map.of("client_id", 1));

        assertThat(result.success()).isTrue();
        assertThat(result.data().get("full_name")).isEqualTo("Rahul Sharma");
        assertThat(result.data().get("pan")).isEqualTo("ABCDE1234F");
        assertThat(result.summary()).contains("Rahul Sharma");
    }

    @Test
    @DisplayName("RiskAssessmentTool: should return risk score and category")
    void testRiskAssessmentToolSuccess() {
        RaResultResponse response = new RaResultResponse(
                10L, 1L, "COMPLETED", 42,
                new com.wealthtech.crm.modules.riskappetite.dto.ScoreCategoryResponse("MODERATE", "Moderate", 30, 50),
                null, null
        );
        when(raService.getLatestCompletedAssessment(1L)).thenReturn(response);

        AgentToolResult result = riskAssessmentTool.execute(Map.of("client_id", 1));

        assertThat(result.success()).isTrue();
        assertThat(result.data().get("total_score")).isEqualTo(42);
        assertThat(result.data().get("category_code")).isEqualTo("MODERATE");
    }

    @Test
    @DisplayName("PortfolioReviewTool: should return holdings and valuation")
    void testPortfolioReviewToolSuccess() {
        PortfolioReviewResponse response = new PortfolioReviewResponse(
                5L, 1L, "COMPLETED",
                new BigDecimal("500000.00"), new BigDecimal("650000.00"),
                new BigDecimal("150000.00"), 30.0, 14.0, "eCAS Review",
                List.of(), null, null
        );
        when(reviewService.getLatestReview(1L)).thenReturn(response);

        AgentToolResult result = portfolioReviewTool.execute(Map.of("client_id", 1));

        assertThat(result.success()).isTrue();
        assertThat(result.data().get("review_id")).isEqualTo(5L);
        assertThat(result.summary()).contains("Total Value ₹650000.00");
    }

    @Test
    @DisplayName("EligibleFundsTool: should return filtered funds")
    void testEligibleFundsToolSuccess() {
        EligibleFundResponse fund = new EligibleFundResponse(
                101L, "HDFC Flexi Cap Fund", "INF179K01BE2",
                "Flexi Cap", "Equity", "Mutual Fund", "MODERATE"
        );
        when(reviewService.getEligibleFunds("MODERATE")).thenReturn(List.of(fund));

        AgentToolResult result = eligibleFundsTool.execute(Map.of("category_code", "MODERATE"));

        assertThat(result.success()).isTrue();
        assertThat(result.data().get("count")).isEqualTo(1);
    }

    @Test
    @DisplayName("FundResearchRagTool: should return grounded RAG evidence")
    void testFundResearchRagToolSuccess() {
        RagQueryResponse ragResponse = new RagQueryResponse(
                "Analyze HDFC Flexi Cap performance", "conv-1", 1,
                "HDFC Flexi Cap Fund exhibits consistent alpha and low tracking error.",
                true, false, 0.85, List.of("FACTSHEET"), List.of(),
                100L, 500L, 600L, "Success"
        );
        when(ragSynthesisService.queryAndSynthesize(any())).thenReturn(ragResponse);

        AgentToolResult result = fundResearchRagTool.execute(Map.of("query", "Analyze HDFC Flexi Cap performance"));

        assertThat(result.success()).isTrue();
        assertThat(result.data().get("answer")).toString().contains("alpha");
    }

    @Test
    @DisplayName("StageRecommendationDraftTool: should stage recommendation proposal")
    void testStageRecommendationDraftToolSuccess() {
        PortfolioRecommendationResponse recResponse = new PortfolioRecommendationResponse(
                20L, 1L, 5L, "REPLACE_FUNDS", "SAVED",
                "MODERATE", null, null, List.of(), null
        );
        when(reviewService.createRecommendation(any())).thenReturn(recResponse);

        Map<String, Object> params = Map.of(
                "client_id", 1,
                "portfolio_review_id", 5,
                "flow_type", "REPLACE_FUNDS",
                "funds", List.of(Map.of("eligible_fund_id", 101, "amount", 100000))
        );

        AgentToolResult result = stageRecommendationDraftTool.execute(params);

        assertThat(result.success()).isTrue();
        assertThat(result.data().get("recommendation_id")).isEqualTo(20L);
        assertThat(result.data().get("status")).isEqualTo("SAVED");
    }
}
