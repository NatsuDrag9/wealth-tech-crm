package com.wealthtech.crm.modules.agent.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wealthtech.crm.modules.agent.dto.AgentExecutionResult;
import com.wealthtech.crm.modules.agent.dto.AgentRunRequest;
import com.wealthtech.crm.modules.agent.strategy.AgentExecutionStrategy;
import com.wealthtech.crm.modules.agent.strategy.AgentExecutionStrategyResolver;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Controller exposing AI Agentic execution endpoints for WealthTech CRM.
 */
@RestController
@RequestMapping("/java-wtc-api/v1/agent")
@RequiredArgsConstructor
@Slf4j
public class AgentController {

    private final AgentExecutionStrategyResolver strategyResolver;

    /**
     * Executes the AI Agentic workflow (portfolio audit, fund research, compliance checks, and proposal staging)
     * using the dynamically selected mode (vanilla, framework, or mcp).
     */
    @PostMapping("/run")
    @PreAuthorize("hasAuthority('portfolioreview:create') or hasAuthority('portfolioreview:update')")
    public ResponseEntity<AgentExecutionResult> runAgent(@Valid @RequestBody AgentRunRequest request) {
        log.info("Received Agent execution request for client {} with mode {} and flow {}",
                request.clientId(), request.resolvedAgentMode(), request.resolvedFlowType());

        AgentExecutionStrategy strategy = strategyResolver.resolve(request.resolvedAgentMode());
        AgentExecutionResult result = strategy.execute(request);

        return ResponseEntity.ok(result);
    }
}
