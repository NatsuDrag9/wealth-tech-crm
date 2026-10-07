package com.wealthtech.crm.modules.agent.strategy.impl;

import org.springframework.stereotype.Component;

import com.wealthtech.crm.modules.agent.dto.AgentExecutionResult;
import com.wealthtech.crm.modules.agent.dto.AgentRunRequest;
import com.wealthtech.crm.modules.agent.enums.AgentMode;
import com.wealthtech.crm.modules.agent.service.VanillaAgentExecutor;
import com.wealthtech.crm.modules.agent.strategy.AgentExecutionStrategy;

import lombok.RequiredArgsConstructor;

/**
 * Step 1 Strategy: Dispatches to the hand-crafted VanillaAgentExecutor.
 */
@Component
@RequiredArgsConstructor
public class VanillaJavaAgentStrategy implements AgentExecutionStrategy {

    private final VanillaAgentExecutor vanillaExecutor;

    @Override
    public AgentMode getSupportedMode() {
        return AgentMode.VANILLA;
    }

    @Override
    public AgentExecutionResult execute(AgentRunRequest request) {
        return vanillaExecutor.execute(request);
    }
}
