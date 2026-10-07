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
import com.wealthtech.crm.modules.agent.service.VanillaAgentExecutor;
import com.wealthtech.crm.modules.agent.strategy.AgentExecutionStrategyResolver;
import com.wealthtech.crm.modules.agent.strategy.impl.VanillaJavaAgentStrategy;
import com.wealthtech.crm.modules.agent.tool.AgentTool;
import com.wealthtech.crm.modules.agent.tool.AgentToolRegistry;
import com.wealthtech.crm.modules.agent.tool.AgentToolResult;
import com.wealthtech.crm.modules.customer.entity.Client;
import com.wealthtech.crm.modules.customer.repository.ClientRepository;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VanillaAgentExecutorTest {

    @Mock
    private GeminiGenerationService geminiService;

    @Mock
    private PiiProtectionGateway piiGateway;

    @Mock
    private ClientRepository clientRepository;

    @Mock
    private AgentTool mockTool;

    private AgentToolRegistry toolRegistry;
    private VanillaAgentExecutor executor;
    private AgentExecutionStrategyResolver strategyResolver;

    @BeforeEach
    void setUp() {
        when(mockTool.getName()).thenReturn("get_portfolio_review");
        when(mockTool.getDescription()).thenReturn("Fetch holdings");
        when(mockTool.getParameterSchema()).thenReturn(Map.of("type", "object"));

        toolRegistry = new AgentToolRegistry(List.of(mockTool));

        executor = new VanillaAgentExecutor(
                toolRegistry,
                geminiService,
                piiGateway,
                clientRepository,
                new SimpleMeterRegistry()
        );

        VanillaJavaAgentStrategy vanillaStrategy = new VanillaJavaAgentStrategy(executor);
        strategyResolver = new AgentExecutionStrategyResolver(List.of(vanillaStrategy));
    }

    @Test
    @DisplayName("Should execute ReAct loop: tool call then final answer rehydration")
    void shouldExecuteReActLoopSuccessfully() {
        // Given
        Long clientId = 1L;
        AgentRunRequest request = new AgentRunRequest(
                clientId,
                10L,
                "REPLACE_FUNDS",
                "Rebalance portfolio",
                AgentMode.VANILLA,
                "conv-123"
        );

        Client dummyClient = Client.builder().id(clientId).firstName("Rahul").lastName("Sharma").build();
        when(clientRepository.findByIdWithRelations(clientId)).thenReturn(Optional.of(dummyClient));

        when(piiGateway.tokenize(anyString(), any(), any())).thenReturn(
                new PiiTokenizationResult("Client ID: 1. Redacted goal", Map.of())
        );

        // Turn 1: Gemini calls get_portfolio_review
        var toolCall = new GeminiToolCallResponse.ToolCall("get_portfolio_review", Map.of("client_id", 1));
        var response1 = new GeminiToolCallResponse(null, List.of(toolCall));

        // Turn 2: Gemini completes with text
        var response2 = new GeminiToolCallResponse("Portfolio rebalanced successfully for {{CLIENT_NAME_1}}.", List.of());

        when(geminiService.generateWithTools(anyString(), any(), any()))
                .thenReturn(response1)
                .thenReturn(response2);

        when(mockTool.execute(any())).thenReturn(
                AgentToolResult.success(Map.of("total_value", 500000), "Review retrieved with 4 holdings.")
        );

        when(piiGateway.rehydrateWithEntity(eq("Portfolio rebalanced successfully for {{CLIENT_NAME_1}}."), any(), any()))
                .thenReturn("Portfolio rebalanced successfully for Rahul Sharma.");

        // When
        var strategy = strategyResolver.resolve(AgentMode.VANILLA);
        AgentExecutionResult result = strategy.execute(request);

        // Then
        assertThat(result.success()).isTrue();
        assertThat(result.agentMode()).isEqualTo(AgentMode.VANILLA);
        assertThat(result.summary()).isEqualTo("Portfolio rebalanced successfully for Rahul Sharma.");
        assertThat(result.toolSteps()).hasSize(1);
        assertThat(result.toolSteps().get(0).toolName()).isEqualTo("get_portfolio_review");
        assertThat(result.toolSteps().get(0).success()).isTrue();
    }
}
