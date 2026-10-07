package com.wealthtech.crm.infrastructure.ai.dto;

import java.util.List;
import java.util.Map;

public record GeminiToolCallResponse(
        String text,
        List<ToolCall> toolCalls
) {
    public boolean hasToolCalls() {
        return toolCalls != null && !toolCalls.isEmpty();
    }

    public ToolCall getFirstToolCall() {
        return hasToolCalls() ? toolCalls.get(0) : null;
    }

    public record ToolCall(
            String name,
            Map<String, Object> arguments
    ) {}
}
