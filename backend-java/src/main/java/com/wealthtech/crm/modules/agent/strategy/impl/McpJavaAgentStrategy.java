package com.wealthtech.crm.modules.agent.strategy.impl;

import org.springframework.stereotype.Component;

import com.wealthtech.crm.modules.agent.dto.AgentExecutionResult;
import com.wealthtech.crm.modules.agent.dto.AgentRunRequest;
import com.wealthtech.crm.modules.agent.enums.AgentMode;
import com.wealthtech.crm.modules.agent.mcp.executor.McpAgentExecutor;
import com.wealthtech.crm.modules.agent.strategy.AgentExecutionStrategy;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Step 3: MCP Strategy.
 * Bridges AgentExecutionStrategy to the McpAgentExecutor using standard Model Context Protocol.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class McpJavaAgentStrategy implements AgentExecutionStrategy {

    private final McpAgentExecutor mcpAgentExecutor;

    @Override
    public AgentMode getSupportedMode() {
        return AgentMode.MCP;
    }

    @Override
    public AgentExecutionResult execute(AgentRunRequest request) {
        log.info("Executing agent goal via MCP strategy for client: {}", request.clientId());
        return mcpAgentExecutor.execute(request);
    }
}
