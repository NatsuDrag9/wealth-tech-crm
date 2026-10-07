package com.wealthtech.crm.modules.agent.tool;

import java.util.Map;

/**
 * Interface representing an executable agent tool in Step 1 (Manual Agent).
 */
public interface AgentTool {

    /**
     * Unique function name matching Gemini functionDeclaration naming conventions.
     */
    String getName();

    /**
     * Clear description used by Gemini to decide when to invoke the tool.
     */
    String getDescription();

    /**
     * JSON Schema structure defining expected parameter inputs.
     */
    Map<String, Object> getParameterSchema();

    /**
     * Deterministic business execution delegating to domain services.
     */
    AgentToolResult execute(Map<String, Object> parameters);
}
