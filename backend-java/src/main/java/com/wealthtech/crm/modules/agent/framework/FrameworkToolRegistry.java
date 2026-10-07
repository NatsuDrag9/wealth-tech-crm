package com.wealthtech.crm.modules.agent.framework;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

/**
 * Enterprise tool callback registry discovering and registering @Tool annotated services.
 */
@Service
@Slf4j
public class FrameworkToolRegistry {

    private final Map<String, FrameworkToolDefinition> toolDefinitions = new HashMap<>();

    public void registerTool(
            String name,
            String description,
            Map<String, Object> inputSchema,
            ToolCallback callback) {
        toolDefinitions.put(name, new FrameworkToolDefinition(name, description, inputSchema, callback));
        log.info("Registered framework tool callback: '{}'", name);
    }

    public FrameworkToolDefinition getTool(String name) {
        return toolDefinitions.get(name);
    }

    public Map<String, FrameworkToolDefinition> getAllTools() {
        return Collections.unmodifiableMap(toolDefinitions);
    }

    public record FrameworkToolDefinition(
            String name,
            String description,
            Map<String, Object> inputSchema,
            ToolCallback callback
    ) {}
}
