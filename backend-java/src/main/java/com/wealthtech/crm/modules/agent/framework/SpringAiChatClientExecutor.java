package com.wealthtech.crm.modules.agent.framework;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wealthtech.crm.infrastructure.ai.GeminiGenerationService;
import com.wealthtech.crm.infrastructure.ai.dto.GeminiToolCallResponse;
import com.wealthtech.crm.infrastructure.ai.security.PiiProtectionGateway;
import com.wealthtech.crm.infrastructure.ai.security.PiiTokenizationResult;
import com.wealthtech.crm.modules.agent.dto.AgentExecutionResult;
import com.wealthtech.crm.modules.agent.dto.AgentRunRequest;
import com.wealthtech.crm.modules.agent.dto.AgentStepRecord;
import com.wealthtech.crm.modules.agent.enums.AgentMode;
import com.wealthtech.crm.modules.customer.entity.Client;
import com.wealthtech.crm.modules.customer.entity.ClientProfile;
import com.wealthtech.crm.modules.customer.repository.ClientRepository;
import com.wealthtech.crm.modules.portfolioreview.dto.PortfolioRecommendationResponse;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Step 2: Spring AI Framework-Style ChatClient Execution Strategy.
 * 
 * Features:
 * - Framework tool execution driven by FrameworkToolRegistry (@Tool callbacks).
 * - Automatic function parameter dispatch and error-tolerant execution.
 * - Centralized PiiProtectionGateway tokenization wrapping tool observations.
 * - Spring AI conversation context and multi-turn state management.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SpringAiChatClientExecutor {

    private final FrameworkToolRegistry frameworkToolRegistry;
    private final GeminiGenerationService geminiService;
    private final PiiProtectionGateway piiGateway;
    private final ClientRepository clientRepository;
    private final MeterRegistry meterRegistry;

    private static final int MAX_STEPS = 8;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AgentExecutionResult execute(AgentRunRequest request) {
        long startTime = System.currentTimeMillis();
        Timer.Sample sample = Timer.start(meterRegistry);

        Client client = clientRepository.findByIdWithRelations(request.clientId()).orElse(null);
        ClientProfile profile = client != null ? client.getProfile() : null;

        List<AgentStepRecord> stepRecords = new ArrayList<>();
        List<Map<String, Object>> contents = new ArrayList<>();
        PortfolioRecommendationResponse stagedRecommendation = null;

        String rawGoal = String.format("Client ID: %d. Flow Type: %s. Goal: %s",
                request.clientId(), request.resolvedFlowType(), request.resolvedUserGoal());
        PiiTokenizationResult tokenizedGoal = piiGateway.tokenize(rawGoal, client, profile);

        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", tokenizedGoal.sanitizedText()))
        ));

        String systemInstruction = """
                You are a SEBI-registered Portfolio Advisory Copilot operating within the Spring AI Framework.
                Orchestrate domain tools (@Tool callbacks) to review holdings, evaluate risk appetite, and stage recommendation proposals.
                """;

        List<Map<String, Object>> functionDeclarations = frameworkToolRegistry.getAllTools().values().stream()
                .map(tool -> Map.of(
                        "name", (Object) tool.name(),
                        "description", (Object) tool.description(),
                        "parameters", (Object) tool.inputSchema()
                ))
                .toList();

        int step = 0;

        try {
            while (step < MAX_STEPS) {
                step++;

                GeminiToolCallResponse modelResponse = geminiService.generateWithTools(
                        systemInstruction,
                        contents,
                        functionDeclarations
                );

                if (modelResponse.hasToolCalls()) {
                    GeminiToolCallResponse.ToolCall toolCall = modelResponse.getFirstToolCall();
                    String toolName = toolCall.name();
                    Map<String, Object> toolArgs = toolCall.arguments() != null ? toolCall.arguments() : Map.of();

                    long stepStart = System.currentTimeMillis();
                    log.info("Spring AI Step {}: Invoking @Tool callback '{}' with arguments {}", step, toolName, toolArgs);

                    contents.add(Map.of(
                            "role", "model",
                            "parts", List.of(Map.of(
                                    "functionCall", Map.of(
                                            "name", toolName,
                                            "args", toolArgs
                                    )
                            ))
                    ));

                    var toolDef = frameworkToolRegistry.getTool(toolName);
                    Object toolOutput;
                    boolean isSuccess = true;

                    if (toolDef == null) {
                        toolOutput = Map.of("error", "No @Tool callback registered for: " + toolName);
                        isSuccess = false;
                    } else {
                        try {
                            toolOutput = toolDef.callback().call(toolArgs);
                        } catch (Exception e) {
                            log.error("Exception in framework @Tool callback '{}': {}", toolName, e.getMessage(), e);
                            toolOutput = Map.of("error", e.getMessage());
                            isSuccess = false;
                        }
                    }

                    long stepDuration = System.currentTimeMillis() - stepStart;

                    if ("stage_recommendation_proposal".equals(toolName) && toolOutput instanceof Map<?, ?> outMap) {
                        Object recObj = outMap.get("response_object");
                        if (recObj instanceof PortfolioRecommendationResponse recResp) {
                            stagedRecommendation = recResp;
                        }
                    }

                    String rawJson = objectMapper.writeValueAsString(toolOutput);
                    PiiTokenizationResult tokenizedResult = piiGateway.tokenize(rawJson, client, profile);

                    contents.add(Map.of(
                            "role", "function",
                            "parts", List.of(Map.of(
                                    "functionResponse", Map.of(
                                            "name", toolName,
                                            "response", Map.of("content", tokenizedResult.sanitizedText())
                                    )
                            ))
                    ));

                    stepRecords.add(new AgentStepRecord(
                            step,
                            toolName,
                            toolArgs,
                            isSuccess,
                            toolOutput.toString(),
                            stepDuration
                    ));

                    meterRegistry.counter("agent_tool_calls_total", "tool", toolName, "mode", "framework").increment();

                } else {
                    String rawSummary = modelResponse.text() != null ? modelResponse.text() : "Framework agent completed.";
                    String rehydrated = piiGateway.rehydrateWithEntity(rawSummary, client, profile);

                    long totalDuration = System.currentTimeMillis() - startTime;
                    sample.stop(Timer.builder("agent_execution_duration_seconds")
                            .tag("mode", "framework")
                            .tag("status", "success")
                            .register(meterRegistry));
                    meterRegistry.counter("agent_runs_total", "mode", "framework", "status", "success").increment();

                    Map<String, Object> telemetry = Map.of(
                            "total_duration_ms", totalDuration,
                            "steps_count", stepRecords.size(),
                            "mode", "framework"
                    );

                    return AgentExecutionResult.success(
                            AgentMode.FRAMEWORK,
                            rehydrated,
                            stepRecords,
                            stagedRecommendation,
                            telemetry
                    );
                }
            }

            return AgentExecutionResult.failure(
                    AgentMode.FRAMEWORK,
                    "Spring AI agent reached step limit (" + MAX_STEPS + ") without completion.",
                    stepRecords,
                    Map.of("total_duration_ms", System.currentTimeMillis() - startTime, "steps_count", stepRecords.size())
            );

        } catch (Exception e) {
            log.error("Fatal error during Spring AI execution: {}", e.getMessage(), e);
            meterRegistry.counter("agent_runs_total", "mode", "framework", "status", "error").increment();

            return AgentExecutionResult.failure(
                    AgentMode.FRAMEWORK,
                    "Spring AI execution failed: " + e.getMessage(),
                    stepRecords,
                    Map.of("total_duration_ms", System.currentTimeMillis() - startTime, "steps_count", stepRecords.size())
            );
        }
    }
}
