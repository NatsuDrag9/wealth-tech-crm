package com.wealthtech.crm.modules.agent.mcp.client;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wealthtech.crm.modules.agent.mcp.protocol.McpProtocol;
import com.wealthtech.crm.modules.agent.mcp.server.McpServer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Standard MCP Client component communicating with MCP servers via JSON-RPC 2.0.
 * In process/container environments, uses synchronous transport; can be swapped
 * for SSE or Stdio transports transparently without altering agent execution logic.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class McpClient {

    private final McpServer localServer;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Executes 'tools/list' against the MCP Server to discover available tools and schemas.
     */
    public List<McpProtocol.McpToolDefinition> listTools() {
        McpProtocol.McpRequest request = McpProtocol.McpRequest.of("list-1", "tools/list", Map.of());
        McpProtocol.McpResponse response = localServer.handleRequest(request);

        if (response.error() != null) {
            log.error("MCP Client error listing tools: {}", response.error().message());
            return List.of();
        }

        if (response.result() instanceof McpProtocol.McpListToolsResult listResult) {
            return listResult.tools();
        }

        return List.of();
    }

    /**
     * Executes 'tools/call' against the MCP Server with structured arguments.
     */
    public McpProtocol.McpCallToolResult callTool(String name, Map<String, Object> arguments) {
        McpProtocol.McpRequest request = McpProtocol.McpRequest.of(
                "call-" + System.currentTimeMillis(),
                "tools/call",
                Map.of("name", name, "arguments", arguments != null ? arguments : Map.of())
        );

        McpProtocol.McpResponse response = localServer.handleRequest(request);

        if (response.error() != null) {
            return McpProtocol.McpCallToolResult.error(response.error().message());
        }

        if (response.result() instanceof McpProtocol.McpCallToolResult callResult) {
            return callResult;
        }

        return McpProtocol.McpCallToolResult.error("Unexpected response payload format from MCP Server");
    }
}
