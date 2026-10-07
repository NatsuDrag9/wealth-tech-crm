package com.wealthtech.crm.modules.agent.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AgentMode {
    VANILLA("vanilla"),
    FRAMEWORK("framework"),
    MCP("mcp");

    private final String value;

    AgentMode(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static AgentMode fromValue(String value) {
        if (value == null || value.isBlank()) {
            return VANILLA;
        }
        for (AgentMode mode : values()) {
            if (mode.value.equalsIgnoreCase(value.trim())) {
                return mode;
            }
        }
        return VANILLA;
    }
}
