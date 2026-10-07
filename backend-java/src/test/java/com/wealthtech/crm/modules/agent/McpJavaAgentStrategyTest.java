package com.wealthtech.crm.modules.agent;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.wealthtech.crm.infrastructure.ai.GeminiGenerationService;
import com.wealthtech.crm.infrastructure.ai.dto.GeminiToolCallResponse;
import com.wealthtech.crm.infrastructure.ai.security.PiiProtectionGateway;
import com.wealthtech.crm.infrastructure.ai.security.PiiTokenizationResult;
import com.wealthtech.crm.modules.agent.dto.AgentExecutionResult;
import com.wealthtech.crm.modules.agent.dto.AgentRunRequest;
import com.wealthtech.crm.modules.agent.enums.AgentMode;
import com.wealthtech.crm.modules.agent.framework.FrameworkToolRegistry;
import com.wealthtech.crm.modules.agent.mcp.client.McpClient;
import com.wealthtech.crm.modules.agent.mcp.executor.McpAgentExecutor;
import com.wealthtech.crm.modules.agent.mcp.protocol.McpProtocol;
import com.wealthtech.crm.modules.agent.mcp.server.McpServer;
import com.wealthtech.crm.modules.agent.strategy.impl.McpJavaAgentStrategy;
import com.wealthtech.crm.modules.customer.entity.Client;
import com.wealthtech.crm.modules.customer.repository.ClientRepository;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class McpJavaAgentStrategyTest {

    @Mock
    private GeminiGenerationService geminiService;

    @Mock
    private PiiProtectionGateway piiGateway;

    @Mock
    private ClientRepository clientRepository;

    private FrameworkToolRegistry toolRegistry;
    private McpServer mcpServer;
    private McpClient mcpClient;
    private McpAgentExecutor mcpAgentExecutor;
    private McpJavaAgentStrategy mcpStrategy;

    @BeforeEach
    void setUp() {
        toolRegistry = new FrameworkToolRegistry();
        toolRegistry.registerTool(
                "get_risk_assessment",
                "Fetches completed SEBI risk assessment",
                Map.of("type", "object"),
                args -> Map.of("score", 45, "category", "AGGRESSIVE")
        );

        mcpServer = new McpServer(toolRegistry);
        mcpClient = new McpClient(mcpServer);

        mcpAgentExecutor = new McpAgentExecutor(
                mcpClient,
                geminiService,
                piiGateway,
                clientRepository,
                new SimpleMeterRegistry()
        );

        mcpStrategy = new McpJavaAgentStrategy(mcpAgentExecutor);
    }

    @Test
    @DisplayName("McpServer & McpClient: verifies tools/list and tools/call JSON-RPC 2.0 protocol contract")
    void testMcpProtocolContract() {
        // Test tools/list
        var tools = mcpClient.listTools();
        assertThat(tools).hasSize(1);
        assertThat(tools.get(0).name()).isEqualTo("get_risk_assessment");

        // Test tools/call
        var callResult = mcpClient.callTool("get_risk_assessment", Map.of("client_id", 1));
        assertThat(callResult.isError()).isFalse();
        assertThat(callResult.content().get(0).text()).contains("AGGRESSIVE");
    }

    @Test
    @DisplayName("McpJavaAgentStrategy: verifies Step 3 agent execution loop across MCP boundary")
    void testMcpAgentExecution() {
        Long clientId = 5L;
        AgentRunRequest request = new AgentRunRequest(
                clientId,
                null,
                "NEW_PORTFOLIO",
                "Run MCP portfolio allocation",
                AgentMode.MCP,
                "conv-mcp-1"
        );

        Client dummyClient = Client.builder().id(clientId).firstName("Karan").lastName("Verma").build();
        when(clientRepository.findByIdWithRelations(clientId)).thenReturn(Optional.of(dummyClient));

        when(piiGateway.tokenize(anyString(), any(), any())).thenReturn(
                new PiiTokenizationResult("Client: 5. Sanitized goal", Map.of())
        );

        // Turn 1: Gemini calls MCP tool get_risk_assessment
        var toolCall = new GeminiToolCallResponse.ToolCall("get_risk_assessment", Map.of("client_id", 5));
        var response1 = new GeminiToolCallResponse(null, List.of(toolCall));

        // Turn 2: Gemini completes
        var response2 = new GeminiToolCallResponse("Portfolio advice finalized using Model Context Protocol.", List.of());

        when(geminiService.generateWithTools(anyString(), any(), any()))
                .thenReturn(response1)
                .thenReturn(response2);

        when(piiGateway.rehydrateWithEntity(eq("Portfolio advice finalized using Model Context Protocol."), any(), any()))
                .thenReturn("Portfolio advice finalized for Karan Verma using Model Context Protocol.");

        // Execute Strategy
        assertThat(mcpStrategy.getSupportedMode()).isEqualTo(AgentMode.MCP);
        AgentExecutionResult result = mcpStrategy.execute(request);

        // Assertions
        assertThat(result.success()).isTrue();
        assertThat(result.agentMode()).isEqualTo(AgentMode.MCP);
        assertThat(result.summary()).contains("Karan Verma");
        assertThat(result.toolSteps()).hasSize(1);
        assertThat(result.toolSteps().get(0).toolName()).isEqualTo("get_risk_assessment");
        assertThat(result.toolSteps().get(0).success()).isTrue();
        assertThat(result.telemetry()).containsEntry("protocol", "JSON-RPC 2.0");
    }
}
