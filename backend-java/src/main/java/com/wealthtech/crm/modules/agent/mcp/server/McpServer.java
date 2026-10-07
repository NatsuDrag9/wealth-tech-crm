package com.wealthtech.crm.modules.agent.mcp.server;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wealthtech.crm.modules.agent.framework.FrameworkToolRegistry;
import com.wealthtech.crm.modules.agent.mcp.protocol.McpProtocol;

import io.modelcontextprotocol.spec.McpSchema;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Standard MCP Server component exposing CRM domain tools over JSON-RPC 2.0,
 * integrated with the official io.modelcontextprotocol.sdk specification.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class McpServer {

    private final FrameworkToolRegistry toolRegistry;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public McpProtocol.McpResponse handleRequest(McpProtocol.McpRequest request) {
        if (request == null || request.method() == null) {
            return McpProtocol.McpResponse.error("null", -32600, "Invalid Request: method is missing");
        }

        String id = request.id() != null ? request.id() : "1";

        try {
            return switch (request.method()) {
                case "tools/list" -> McpProtocol.McpResponse.success(id, listTools());
                case "tools/call" -> handleCallTool(id, request.params());
                default -> McpProtocol.McpResponse.error(id, -32601, "Method not found: " + request.method());
            };
        } catch (Exception e) {
            log.error("Unhandled error processing MCP request {}: {}", request.method(), e.getMessage(), e);
            return McpProtocol.McpResponse.error(id, -32603, "Internal error: " + e.getMessage());
        }
    }

    public McpProtocol.McpListToolsResult listTools() {
        List<McpProtocol.McpToolDefinition> tools = toolRegistry.getAllTools().values().stream()
                .map(t -> new McpProtocol.McpToolDefinition(t.name(), t.description(), t.inputSchema()))
                .toList();
        return new McpProtocol.McpListToolsResult(tools);
    }

    @SuppressWarnings("unchecked")
    private McpProtocol.McpResponse handleCallTool(String id, Map<String, Object> params) {
        if (params == null || !params.containsKey("name")) {
            return McpProtocol.McpResponse.error(id, -32602, "Invalid params: 'name' is required");
        }

        String toolName = (String) params.get("name");
        Map<String, Object> arguments = (Map<String, Object>) params.getOrDefault("arguments", Map.of());

        var toolDef = toolRegistry.getTool(toolName);
        if (toolDef == null) {
            return McpProtocol.McpResponse.success(id, McpProtocol.McpCallToolResult.error("Unknown tool: " + toolName));
        }

        try {
            Object result = toolDef.callback().call(arguments);
            String resultText = (result instanceof String s) ? s : objectMapper.writeValueAsString(result);
            return McpProtocol.McpResponse.success(id, McpProtocol.McpCallToolResult.success(resultText));
        } catch (Exception e) {
            log.error("Error executing MCP tool call '{}': {}", toolName, e.getMessage(), e);
            return McpProtocol.McpResponse.success(id, McpProtocol.McpCallToolResult.error(e.getMessage()));
        }
    }
}
