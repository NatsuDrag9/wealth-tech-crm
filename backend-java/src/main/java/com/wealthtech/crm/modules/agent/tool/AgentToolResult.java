package com.wealthtech.crm.modules.agent.tool;

import java.util.Map;

public record AgentToolResult(
        boolean success,
        Map<String, Object> data,
        String summary,
        String errorMessage
) {
    public static AgentToolResult success(Map<String, Object> data, String summary) {
        return new AgentToolResult(true, data, summary, null);
    }

    public static AgentToolResult error(String errorMessage) {
        return new AgentToolResult(false, Map.of(), null, errorMessage);
    }
}
