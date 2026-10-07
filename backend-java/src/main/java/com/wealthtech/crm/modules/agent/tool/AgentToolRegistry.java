package com.wealthtech.crm.modules.agent.tool;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

/**
 * Registry holding and providing all Spring-managed AgentTool implementations.
 */
@Service
@Slf4j
public class AgentToolRegistry {

    private final Map<String, AgentTool> toolsByName;

    public AgentToolRegistry(List<AgentTool> tools) {
        Map<String, AgentTool> map = new HashMap<>();
        for (AgentTool tool : tools) {
            map.put(tool.getName(), tool);
            log.info("Registered agent tool: '{}'", tool.getName());
        }
        this.toolsByName = Collections.unmodifiableMap(map);
    }

    public Optional<AgentTool> getTool(String name) {
        if (name == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(toolsByName.get(name.trim()));
    }

    public List<AgentTool> getAllTools() {
        return List.copyOf(toolsByName.values());
    }

    /**
     * Converts registered tools to Gemini API functionDeclarations structure.
     */
    public List<Map<String, Object>> getGeminiFunctionDeclarations() {
        return toolsByName.values().stream()
                .map(tool -> Map.of(
                        "name", (Object) tool.getName(),
                        "description", (Object) tool.getDescription(),
                        "parameters", (Object) tool.getParameterSchema()
                ))
                .toList();
    }
}
