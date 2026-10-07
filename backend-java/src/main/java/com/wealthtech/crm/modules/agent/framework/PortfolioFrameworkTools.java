package com.wealthtech.crm.modules.agent.framework;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.wealthtech.crm.modules.customer.dto.ClientResponse;
import com.wealthtech.crm.modules.customer.service.ClientService;
import com.wealthtech.crm.modules.portfolioreview.dto.CreateRecommendationRequest;
import com.wealthtech.crm.modules.portfolioreview.dto.EligibleFundResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.PortfolioRecommendationResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.PortfolioReviewResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.RagQueryRequest;
import com.wealthtech.crm.modules.portfolioreview.dto.RagQueryResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.RfItemRequest;
import com.wealthtech.crm.modules.portfolioreview.service.PortfolioReviewService;
import com.wealthtech.crm.modules.portfolioreview.service.RagSynthesisService;
import com.wealthtech.crm.modules.riskappetite.dto.RaResultResponse;
import com.wealthtech.crm.modules.riskappetite.service.RaService;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service component exposing domain capabilities using @Tool annotations,
 * mirroring Spring AI's tool provider pattern.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PortfolioFrameworkTools {

    private final ClientService clientService;
    private final RaService raService;
    private final PortfolioReviewService reviewService;
    private final RagSynthesisService ragSynthesisService;
    private final FrameworkToolRegistry registry;

    @PostConstruct
    public void registerDeclarations() {
        registry.registerTool(
                "get_client_profile",
                "Retrieves verified KYC, identity, contact information, and Relationship Manager details for a client.",
                Map.of("type", "object", "properties", Map.of("client_id", Map.of("type", "integer")), "required", List.of("client_id")),
                args -> getClientProfile(Long.valueOf(args.get("client_id").toString()))
        );

        registry.registerTool(
                "get_risk_assessment",
                "Fetches the latest completed SEBI risk assessment and score category for a client.",
                Map.of("type", "object", "properties", Map.of("client_id", Map.of("type", "integer")), "required", List.of("client_id")),
                args -> getRiskAssessment(Long.valueOf(args.get("client_id").toString()))
        );

        registry.registerTool(
                "get_portfolio_review",
                "Retrieves the client's latest portfolio review, current holdings, valuation, and SELL/HOLD action tags.",
                Map.of("type", "object", "properties", Map.of("client_id", Map.of("type", "integer")), "required", List.of("client_id")),
                args -> getPortfolioReview(Long.valueOf(args.get("client_id").toString()))
        );

        registry.registerTool(
                "get_eligible_funds",
                "Fetches curated and approved mutual funds filtered by risk category code.",
                Map.of("type", "object", "properties", Map.of("category_code", Map.of("type", "string")), "required", List.of("category_code")),
                args -> getEligibleFunds(args.get("category_code") != null ? args.get("category_code").toString() : null)
        );

        registry.registerTool(
                "research_funds_rag",
                "Performs evidence-grounded research across official mutual fund regulatory disclosures using RAG.",
                Map.of("type", "object", "properties", Map.of("query", Map.of("type", "string")), "required", List.of("query")),
                args -> researchFundsRag(args.get("query").toString())
        );

        registry.registerTool(
                "stage_recommendation_proposal",
                "Stages a compliant investment recommendation proposal in SAVED status for RM review.",
                Map.of("type", "object", "properties", Map.of(
                        "client_id", Map.of("type", "integer"),
                        "flow_type", Map.of("type", "string")
                ), "required", List.of("client_id", "flow_type")),
                this::stageRecommendation
        );
    }

    @Tool(name = "get_client_profile", description = "Retrieves verified KYC, identity, and profile")
    public Map<String, Object> getClientProfile(Long clientId) {
        ClientResponse c = clientService.getClient(clientId);
        return Map.of(
                "id", c.id(),
                "full_name", c.fullName(),
                "pan", c.pan(),
                "kyc_status", c.kycStatus(),
                "status", c.status()
        );
    }

    @Tool(name = "get_risk_assessment", description = "Fetches the latest completed SEBI risk assessment")
    public Map<String, Object> getRiskAssessment(Long clientId) {
        RaResultResponse res = raService.getLatestCompletedAssessment(clientId);
        Map<String, Object> map = new HashMap<>();
        map.put("assessment_id", res.id());
        map.put("total_score", res.totalScore());
        if (res.scoreCategory() != null) {
            map.put("category_code", res.scoreCategory().code());
            map.put("category_name", res.scoreCategory().displayName());
        }
        return map;
    }

    @Tool(name = "get_portfolio_review", description = "Retrieves the client's latest portfolio review and holdings")
    public Map<String, Object> getPortfolioReview(Long clientId) {
        PortfolioReviewResponse r = reviewService.getLatestReview(clientId);
        return Map.of(
                "review_id", r.id(),
                "total_invested", r.totalInvested(),
                "total_current_value", r.totalCurrentValue(),
                "holdings_count", r.entries() != null ? r.entries().size() : 0
        );
    }

    @Tool(name = "get_eligible_funds", description = "Fetches approved mutual funds filtered by risk category")
    public List<EligibleFundResponse> getEligibleFunds(String categoryCode) {
        return reviewService.getEligibleFunds(categoryCode);
    }

    @Tool(name = "research_funds_rag", description = "Performs evidence-grounded research across official fund disclosures")
    public Map<String, Object> researchFundsRag(String query) {
        RagQueryRequest req = new RagQueryRequest(query, null, null, null, 4, 0.65, 0.1);
        RagQueryResponse res = ragSynthesisService.queryAndSynthesize(req);
        return Map.of(
                "answer", res.synthesizedAnswer(),
                "citations", res.citations() != null ? res.citations() : List.of()
        );
    }

    @Tool(name = "stage_recommendation_proposal", description = "Stages a compliant investment recommendation proposal")
    @SuppressWarnings("unchecked")
    public Map<String, Object> stageRecommendation(Map<String, Object> args) {
        Long clientId = Long.valueOf(args.get("client_id").toString());
        String flowType = args.get("flow_type").toString();
        Long reviewId = args.get("portfolio_review_id") != null ? Long.valueOf(args.get("portfolio_review_id").toString()) : null;

        List<RfItemRequest> items = new ArrayList<>();
        Object rawFunds = args.get("funds");
        if (rawFunds instanceof List<?> fundList) {
            int order = 1;
            for (Object itemObj : fundList) {
                if (itemObj instanceof Map<?, ?> itemMap) {
                    Long fundId = Long.valueOf(itemMap.get("eligible_fund_id").toString());
                    BigDecimal amount = new BigDecimal(itemMap.get("amount").toString());
                    Long replacesId = itemMap.get("replaces_entry_id") != null ? Long.valueOf(itemMap.get("replaces_entry_id").toString()) : null;
                    items.add(new RfItemRequest(fundId, amount, replacesId, order++));
                }
            }
        }

        if (items.isEmpty()) {
            return Map.of("error", "No funds specified for recommendation staging.");
        }

        PortfolioRecommendationResponse rec = reviewService.createRecommendation(
                new CreateRecommendationRequest(clientId, reviewId, flowType, items)
        );

        return Map.of(
                "recommendation_id", rec.id(),
                "status", rec.status(),
                "flow_type", rec.flowType(),
                "response_object", rec
        );
    }
}
