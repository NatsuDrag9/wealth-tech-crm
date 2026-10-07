package com.wealthtech.crm.modules.agent.service;

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
import com.wealthtech.crm.modules.agent.tool.AgentTool;
import com.wealthtech.crm.modules.agent.tool.AgentToolRegistry;
import com.wealthtech.crm.modules.agent.tool.AgentToolResult;
import com.wealthtech.crm.modules.customer.entity.Client;
import com.wealthtech.crm.modules.customer.entity.ClientProfile;
import com.wealthtech.crm.modules.customer.repository.ClientRepository;
import com.wealthtech.crm.modules.portfolioreview.dto.PortfolioRecommendationResponse;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Step 1: Hand-built Vanilla ReAct Agent Execution Loop.
 * 
 * Execution Loop:
 * 1. Build initial conversation state with user goal and client context.
 * 2. Feed Gemini model registered functionDeclarations.
 * 3. On tool_call:
 *    a. Execute tool via AgentToolRegistry.
 *    b. Pass tool output through PiiProtectionGateway.tokenize() before re-inserting into context.
 *    c. Record step in execution ledger.
 * 4. On final text response:
 *    a. Rehydrate tokens using authentic client entity profile.
 *    b. Package staged recommendation (if any) and telemetry.
 * 5. Safeguard: Hard limit of 8 turns before aborting to prevent infinite loops.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VanillaAgentExecutor {

    private final AgentToolRegistry toolRegistry;
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

        // 1. Initial Prompt with PII redaction
        String rawGoal = String.format("Client ID: %d. Flow Type: %s. Goal: %s",
                request.clientId(), request.resolvedFlowType(), request.resolvedUserGoal());
        PiiTokenizationResult tokenizedGoal = piiGateway.tokenize(rawGoal, client, profile);

        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", tokenizedGoal.sanitizedText()))
        ));

        String systemInstruction = """
                You are a SEBI-registered Portfolio Advisory AI Copilot for WealthTech CRM.
                Your task is to analyze client portfolios, check their risk assessment band, research replacement/new funds using official disclosures, and stage a compliant recommendation proposal.
                
                Rules:
                1. Always check the client's current portfolio review or holdings first.
                2. Fetch the client's latest completed risk assessment to determine their permissible risk band.
                3. Query eligible approved funds matching the client's risk category.
                4. When researching funds, ground your evaluation strictly in verified factsheet/SID data.
                5. Once the portfolio allocation is constructed, stage the proposal using stage_recommendation_proposal.
                6. Conclude with a clear, professional advisory summary explaining the rationale.
                """;

        List<Map<String, Object>> functionDeclarations = toolRegistry.getGeminiFunctionDeclarations();
        int step = 0;

        try {
            while (step < MAX_STEPS) {
                step++;

                GeminiToolCallResponse modelResponse = geminiService.generateWithTools(
                        systemInstruction,
                        contents,
                        functionDeclarations
                );

                // Check if model returned a tool call
                if (modelResponse.hasToolCalls()) {
                    GeminiToolCallResponse.ToolCall toolCall = modelResponse.getFirstToolCall();
                    String toolName = toolCall.name();
                    Map<String, Object> toolArgs = toolCall.arguments() != null ? toolCall.arguments() : Map.of();

                    long stepStart = System.currentTimeMillis();
                    log.info("Agent Step {}: Model requested tool '{}' with args {}", step, toolName, toolArgs);

                    // Add model's tool call turn to conversation history
                    contents.add(Map.of(
                            "role", "model",
                            "parts", List.of(Map.of(
                                    "functionCall", Map.of(
                                            "name", toolName,
                                            "args", toolArgs
                                    )
                            ))
                    ));

                    // Execute tool from registry
                    AgentTool tool = toolRegistry.getTool(toolName).orElse(null);
                    AgentToolResult toolResult;

                    if (tool == null) {
                        toolResult = AgentToolResult.error("Tool '" + toolName + "' is not registered.");
                    } else {
                        toolResult = tool.execute(toolArgs);
                    }

                    long stepDuration = System.currentTimeMillis() - stepStart;

                    // If recommendation was staged, extract response object
                    if ("stage_recommendation_proposal".equals(toolName) && toolResult.success()) {
                        Object respObj = toolResult.data().get("response_object");
                        if (respObj instanceof PortfolioRecommendationResponse recResp) {
                            stagedRecommendation = recResp;
                        }
                    }

                    // Tokenize tool output before returning it to the LLM to prevent PII leakage
                    String rawResultJson = objectMapper.writeValueAsString(toolResult.data());
                    PiiTokenizationResult tokenizedResult = piiGateway.tokenize(rawResultJson, client, profile);

                    // Append function response turn
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
                            toolResult.success(),
                            toolResult.summary() != null ? toolResult.summary() : toolResult.errorMessage(),
                            stepDuration
                    ));

                    meterRegistry.counter("agent_tool_calls_total", "tool", toolName, "mode", "vanilla").increment();

                } else {
                    // Final text response received
                    String rawSummary = modelResponse.text() != null ? modelResponse.text() : "Agent run completed.";
                    String rehydratedSummary = piiGateway.rehydrateWithEntity(rawSummary, client, profile);

                    long totalDuration = System.currentTimeMillis() - startTime;
                    sample.stop(Timer.builder("agent_execution_duration_seconds")
                            .tag("mode", "vanilla")
                            .tag("status", "success")
                            .register(meterRegistry));
                    meterRegistry.counter("agent_runs_total", "mode", "vanilla", "status", "success").increment();

                    Map<String, Object> telemetry = Map.of(
                            "total_duration_ms", totalDuration,
                            "steps_count", stepRecords.size(),
                            "mode", "vanilla"
                    );

                    return AgentExecutionResult.success(
                            AgentMode.VANILLA,
                            rehydratedSummary,
                            stepRecords,
                            stagedRecommendation,
                            telemetry
                    );
                }
            }

            // Exceeded MAX_STEPS without convergence
            String errorMsg = "Agent reached maximum step limit (" + MAX_STEPS + ") without completing goal.";
            log.warn(errorMsg);
            meterRegistry.counter("agent_runs_total", "mode", "vanilla", "status", "max_steps_exceeded").increment();

            return AgentExecutionResult.failure(
                    AgentMode.VANILLA,
                    errorMsg,
                    stepRecords,
                    Map.of("total_duration_ms", System.currentTimeMillis() - startTime, "steps_count", stepRecords.size())
            );

        } catch (Exception e) {
            log.error("Fatal error during VanillaAgentExecutor execution: {}", e.getMessage(), e);
            meterRegistry.counter("agent_runs_total", "mode", "vanilla", "status", "error").increment();

            return AgentExecutionResult.failure(
                    AgentMode.VANILLA,
                    "Agent execution failed: " + e.getMessage(),
                    stepRecords,
                    Map.of("total_duration_ms", System.currentTimeMillis() - startTime, "steps_count", stepRecords.size())
            );
        }
    }
}
