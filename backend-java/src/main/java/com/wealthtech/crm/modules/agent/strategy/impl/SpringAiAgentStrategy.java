package com.wealthtech.crm.modules.agent.strategy.impl;

import org.springframework.stereotype.Component;

import com.wealthtech.crm.modules.agent.dto.AgentExecutionResult;
import com.wealthtech.crm.modules.agent.dto.AgentRunRequest;
import com.wealthtech.crm.modules.agent.enums.AgentMode;
import com.wealthtech.crm.modules.agent.framework.SpringAiChatClientExecutor;
import com.wealthtech.crm.modules.agent.strategy.AgentExecutionStrategy;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Step 2: Spring AI Framework Strategy.
 * Bridges AgentExecutionStrategy to the Spring AI ChatClient execution engine.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SpringAiAgentStrategy implements AgentExecutionStrategy {

    private final SpringAiChatClientExecutor chatClientExecutor;

    @Override
    public AgentMode getSupportedMode() {
        return AgentMode.FRAMEWORK;
    }

    @Override
    public AgentExecutionResult execute(AgentRunRequest request) {
        log.info("Executing agent goal via Spring AI framework strategy for client: {}", request.clientId());
        return chatClientExecutor.execute(request);
    }
}
