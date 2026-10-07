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
import com.wealthtech.crm.modules.agent.framework.SpringAiChatClientExecutor;
import com.wealthtech.crm.modules.agent.strategy.impl.SpringAiAgentStrategy;
import com.wealthtech.crm.modules.customer.entity.Client;
import com.wealthtech.crm.modules.customer.repository.ClientRepository;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpringAiAgentStrategyTest {

    @Mock
    private GeminiGenerationService geminiService;

    @Mock
    private PiiProtectionGateway piiGateway;

    @Mock
    private ClientRepository clientRepository;

    private FrameworkToolRegistry toolRegistry;
    private SpringAiChatClientExecutor chatClientExecutor;
    private SpringAiAgentStrategy strategy;

    @BeforeEach
    void setUp() {
        toolRegistry = new FrameworkToolRegistry();
        toolRegistry.registerTool(
                "get_portfolio_review",
                "Fetches portfolio holdings",
                Map.of("type", "object"),
                args -> Map.of("total_val", 750000, "status", "AUDITED")
        );

        chatClientExecutor = new SpringAiChatClientExecutor(
                toolRegistry,
                geminiService,
                piiGateway,
                clientRepository,
                new SimpleMeterRegistry()
        );

        strategy = new SpringAiAgentStrategy(chatClientExecutor);
    }

    @Test
    @DisplayName("SpringAiAgentStrategy: verifies Step 2 execution mode and @Tool callback execution")
    void testSpringAiStrategyExecution() {
        Long clientId = 10L;
        AgentRunRequest request = new AgentRunRequest(
                clientId,
                2L,
                "REPLACE_FUNDS",
                "Rebalance with Spring AI",
                AgentMode.FRAMEWORK,
                "conv-framework-1"
        );

        Client dummyClient = Client.builder().id(clientId).firstName("Anita").lastName("Deshmukh").build();
        when(clientRepository.findByIdWithRelations(clientId)).thenReturn(Optional.of(dummyClient));

        when(piiGateway.tokenize(anyString(), any(), any())).thenReturn(
                new PiiTokenizationResult("Client: 10. Sanitized goal", Map.of())
        );

        // Turn 1: Gemini calls framework tool get_portfolio_review
        var toolCall = new GeminiToolCallResponse.ToolCall("get_portfolio_review", Map.of("client_id", 10));
        var response1 = new GeminiToolCallResponse(null, List.of(toolCall));

        // Turn 2: Gemini completes
        var response2 = new GeminiToolCallResponse("Portfolio successfully optimized via Spring AI ChatClient.", List.of());

        when(geminiService.generateWithTools(anyString(), any(), any()))
                .thenReturn(response1)
                .thenReturn(response2);

        when(piiGateway.rehydrateWithEntity(eq("Portfolio successfully optimized via Spring AI ChatClient."), any(), any()))
                .thenReturn("Portfolio successfully optimized for Anita Deshmukh via Spring AI ChatClient.");

        // Execute Strategy
        assertThat(strategy.getSupportedMode()).isEqualTo(AgentMode.FRAMEWORK);
        AgentExecutionResult result = strategy.execute(request);

        // Assertions
        assertThat(result.success()).isTrue();
        assertThat(result.agentMode()).isEqualTo(AgentMode.FRAMEWORK);
        assertThat(result.summary()).contains("Anita Deshmukh");
        assertThat(result.toolSteps()).hasSize(1);
        assertThat(result.toolSteps().get(0).toolName()).isEqualTo("get_portfolio_review");
        assertThat(result.toolSteps().get(0).success()).isTrue();
    }
}
