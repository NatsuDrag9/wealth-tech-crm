package com.wealthtech.crm.modules.agent.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

public record AgentStepRecord(
        int step,
        @JsonProperty("tool_name")
        String toolName,
        @JsonProperty("arguments")
        Map<String, Object> arguments,
        @JsonProperty("success")
        boolean success,
        @JsonProperty("observation")
        String observation,
        @JsonProperty("duration_ms")
        long durationMs
) {}
