package com.wealthtech.crm.modules.agent.strategy;

import com.wealthtech.crm.modules.agent.dto.AgentExecutionResult;
import com.wealthtech.crm.modules.agent.dto.AgentRunRequest;
import com.wealthtech.crm.modules.agent.enums.AgentMode;

/**
 * Strategy interface enabling clean tri-mode execution (Vanilla, Framework, MCP).
 */
public interface AgentExecutionStrategy {

    AgentMode getSupportedMode();

    AgentExecutionResult execute(AgentRunRequest request);
}
