package com.wealthtech.crm.modules.agent.strategy;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.wealthtech.crm.modules.agent.enums.AgentMode;
import com.wealthtech.crm.modules.usermanager.exception.BadRequestException;

import lombok.extern.slf4j.Slf4j;

/**
 * Resolves the appropriate AgentExecutionStrategy based on the requested AgentMode.
 */
@Service
@Slf4j
public class AgentExecutionStrategyResolver {

    private final Map<AgentMode, AgentExecutionStrategy> strategyMap = new EnumMap<>(AgentMode.class);

    public AgentExecutionStrategyResolver(List<AgentExecutionStrategy> strategies) {
        for (AgentExecutionStrategy strategy : strategies) {
            strategyMap.put(strategy.getSupportedMode(), strategy);
            log.info("Registered agent strategy for mode: {}", strategy.getSupportedMode());
        }
    }

    public AgentExecutionStrategy resolve(AgentMode mode) {
        AgentMode targetMode = mode != null ? mode : AgentMode.VANILLA;
        AgentExecutionStrategy strategy = strategyMap.get(targetMode);

        if (strategy == null) {
            // If framework or mcp mode is selected before its implementation is wired, fall back or fail clearly
            log.warn("Strategy for mode '{}' is not registered yet. Falling back to VANILLA.", targetMode);
            strategy = strategyMap.get(AgentMode.VANILLA);
        }

        if (strategy == null) {
            throw new BadRequestException("No suitable execution strategy found for agent mode: " + targetMode);
        }

        return strategy;
    }
}
