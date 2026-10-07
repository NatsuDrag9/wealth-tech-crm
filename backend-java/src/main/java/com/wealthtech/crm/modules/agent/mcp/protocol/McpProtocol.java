package com.wealthtech.crm.modules.agent.mcp.protocol;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Standard JSON-RPC 2.0 messages conforming to Model Context Protocol (MCP) specifications.
 */
public class McpProtocol {

    public static final String JSONRPC_VERSION = "2.0";

    public record McpRequest(
            @JsonProperty("jsonrpc") String jsonrpc,
            @JsonProperty("id") String id,
            @JsonProperty("method") String method,
            @JsonProperty("params") Map<String, Object> params
    ) {
        public static McpRequest of(String id, String method, Map<String, Object> params) {
            return new McpRequest(JSONRPC_VERSION, id, method, params);
        }
    }

    public record McpResponse(
            @JsonProperty("jsonrpc") String jsonrpc,
            @JsonProperty("id") String id,
            @JsonProperty("result") Object result,
            @JsonProperty("error") McpError error
    ) {
        public static McpResponse success(String id, Object result) {
            return new McpResponse(JSONRPC_VERSION, id, result, null);
        }

        public static McpResponse error(String id, int code, String message) {
            return new McpResponse(JSONRPC_VERSION, id, null, new McpError(code, message));
        }
    }

    public record McpError(
            @JsonProperty("code") int code,
            @JsonProperty("message") String message
    ) {}

    public record McpToolDefinition(
            @JsonProperty("name") String name,
            @JsonProperty("description") String description,
            @JsonProperty("inputSchema") Map<String, Object> inputSchema
    ) {}

    public record McpListToolsResult(
            @JsonProperty("tools") List<McpToolDefinition> tools
    ) {}

    public record McpCallToolResult(
            @JsonProperty("content") List<McpContentItem> content,
            @JsonProperty("isError") boolean isError
    ) {
        public static McpCallToolResult success(String text) {
            return new McpCallToolResult(List.of(new McpContentItem("text", text)), false);
        }

        public static McpCallToolResult error(String errorMessage) {
            return new McpCallToolResult(List.of(new McpContentItem("text", errorMessage)), true);
        }
    }

    public record McpContentItem(
            @JsonProperty("type") String type,
            @JsonProperty("text") String text
    ) {}
}
