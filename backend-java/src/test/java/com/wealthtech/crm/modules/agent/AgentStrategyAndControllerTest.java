package com.wealthtech.crm.modules.agent;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import com.wealthtech.crm.modules.agent.controller.AgentController;
import com.wealthtech.crm.modules.agent.dto.AgentExecutionResult;
import com.wealthtech.crm.modules.agent.dto.AgentRunRequest;
import com.wealthtech.crm.modules.agent.enums.AgentMode;
import com.wealthtech.crm.modules.agent.strategy.AgentExecutionStrategy;
import com.wealthtech.crm.modules.agent.strategy.AgentExecutionStrategyResolver;
import com.wealthtech.crm.modules.agent.tool.AgentTool;
import com.wealthtech.crm.modules.agent.tool.AgentToolRegistry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgentStrategyAndControllerTest {

    @Mock
    private AgentExecutionStrategy vanillaStrategy;

    @Mock
    private AgentExecutionStrategy frameworkStrategy;

    @Mock
    private AgentTool mockTool;

    @Test
    @DisplayName("AgentExecutionStrategyResolver: should resolve correct strategy based on mode")
    void testStrategyResolver() {
        when(vanillaStrategy.getSupportedMode()).thenReturn(AgentMode.VANILLA);
        when(frameworkStrategy.getSupportedMode()).thenReturn(AgentMode.FRAMEWORK);

        AgentExecutionStrategyResolver resolver = new AgentExecutionStrategyResolver(
                List.of(vanillaStrategy, frameworkStrategy)
        );

        assertThat(resolver.resolve(AgentMode.VANILLA)).isSameAs(vanillaStrategy);
        assertThat(resolver.resolve(AgentMode.FRAMEWORK)).isSameAs(frameworkStrategy);
        // Fallback when requesting MCP before implementation
        assertThat(resolver.resolve(AgentMode.MCP)).isSameAs(vanillaStrategy);
    }

    @Test
    @DisplayName("AgentToolRegistry: should register and retrieve tools by name")
    void testAgentToolRegistry() {
        when(mockTool.getName()).thenReturn("get_risk_assessment");

        AgentToolRegistry registry = new AgentToolRegistry(List.of(mockTool));

        Optional<AgentTool> resolved = registry.getTool("get_risk_assessment");
        assertThat(resolved).isPresent();
        assertThat(resolved.get()).isSameAs(mockTool);

        assertThat(registry.getTool("non_existent")).isEmpty();
    }

    @Test
    @DisplayName("AgentController: should delegate request to resolved strategy")
    void testAgentControllerRun() {
        when(vanillaStrategy.getSupportedMode()).thenReturn(AgentMode.VANILLA);

        AgentExecutionStrategyResolver resolver = new AgentExecutionStrategyResolver(
                List.of(vanillaStrategy)
        );

        AgentController controller = new AgentController(resolver);

        AgentRunRequest request = new AgentRunRequest(
                1L, null, "NEW_PORTFOLIO", "Fresh investment plan", AgentMode.VANILLA, "conv-1"
        );

        AgentExecutionResult mockResult = AgentExecutionResult.success(
                AgentMode.VANILLA, "Success", List.of(), null, java.util.Map.of()
        );

        when(vanillaStrategy.execute(request)).thenReturn(mockResult);

        ResponseEntity<AgentExecutionResult> response = controller.runAgent(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().success()).isTrue();
        assertThat(response.getBody().summary()).isEqualTo("Success");
    }
}
