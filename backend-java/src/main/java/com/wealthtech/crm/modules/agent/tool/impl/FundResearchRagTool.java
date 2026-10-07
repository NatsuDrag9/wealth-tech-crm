package com.wealthtech.crm.modules.agent.tool.impl;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.wealthtech.crm.modules.agent.tool.AgentTool;
import com.wealthtech.crm.modules.agent.tool.AgentToolResult;
import com.wealthtech.crm.modules.portfolioreview.dto.RagQueryRequest;
import com.wealthtech.crm.modules.portfolioreview.dto.RagQueryResponse;
import com.wealthtech.crm.modules.portfolioreview.service.RagSynthesisService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class FundResearchRagTool implements AgentTool {

    private final RagSynthesisService ragSynthesisService;

    @Override
    public String getName() {
        return "research_funds_rag";
    }

    @Override
    public String getDescription() {
        return "Performs evidence-grounded research across official mutual fund regulatory disclosures (factsheets, SIDs, riskometers, TER) using RAG.";
    }

    @Override
    public Map<String, Object> getParameterSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.of(
                        "query", Map.of(
                                "type", "string",
                                "description", "The research inquiry or fund comparison query"
                        ),
                        "candidate_isins", Map.of(
                                "type", "array",
                                "items", Map.of("type", "string"),
                                "description", "List of candidate fund ISINs to constrain vector search"
                        ),
                        "client_id", Map.of(
                                "type", "integer",
                                "description", "Optional client ID for contextual analysis"
                        )
                ),
                "required", List.of("query")
        );
    }

    @Override
    @SuppressWarnings("unchecked")
    public AgentToolResult execute(Map<String, Object> parameters) {
        try {
            Object rawQuery = parameters.get("query");
            if (rawQuery == null || rawQuery.toString().isBlank()) {
                return AgentToolResult.error("Parameter 'query' is required.");
            }
            String query = rawQuery.toString().trim();

            List<String> isins = new ArrayList<>();
            Object rawIsins = parameters.get("candidate_isins");
            if (rawIsins instanceof List<?> list) {
                for (Object item : list) {
                    if (item != null) {
                        isins.add(item.toString().trim());
                    }
                }
            }

            Long clientId = null;
            Object rawClientId = parameters.get("client_id");
            if (rawClientId != null && !rawClientId.toString().isBlank()) {
                clientId = Long.valueOf(rawClientId.toString());
            }

            RagQueryRequest request = new RagQueryRequest(
                    query,
                    null,
                    clientId,
                    isins,
                    4,
                    0.65,
                    0.1
            );

            RagQueryResponse response = ragSynthesisService.queryAndSynthesize(request);

            Map<String, Object> data = new HashMap<>();
            data.put("answer", response.synthesizedAnswer());
            data.put("citations_count", response.citations() != null ? response.citations().size() : 0);
            data.put("evidence_count", response.evidenceChunks() != null ? response.evidenceChunks().size() : 0);

            String answerText = response.synthesizedAnswer() != null ? response.synthesizedAnswer() : "";
            String summary = String.format("RAG Evidence: %d sources retrieved. Summary: %s",
                    response.citations() != null ? response.citations().size() : 0,
                    answerText.length() > 160 ? answerText.substring(0, 160) + "..." : answerText);

            return AgentToolResult.success(data, summary);
        } catch (Exception e) {
            log.error("Error executing FundResearchRagTool: {}", e.getMessage(), e);
            return AgentToolResult.error("Failed to execute RAG fund research: " + e.getMessage());
        }
    }
}
