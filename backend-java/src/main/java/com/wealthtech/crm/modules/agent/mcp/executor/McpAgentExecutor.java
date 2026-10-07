package com.wealthtech.crm.modules.agent.mcp.executor;

import java.util.ArrayList;
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
import com.wealthtech.crm.modules.agent.mcp.client.McpClient;
import com.wealthtech.crm.modules.agent.mcp.protocol.McpProtocol;
import com.wealthtech.crm.modules.customer.entity.Client;
import com.wealthtech.crm.modules.customer.entity.ClientProfile;
import com.wealthtech.crm.modules.customer.repository.ClientRepository;
import com.wealthtech.crm.modules.portfolioreview.dto.PortfolioRecommendationResponse;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Step 3: MCP Protocol Execution Engine.
 * 
 * In this mode, the agent acts strictly as an MCP Client.
 * All tool discovery (tools/list) and tool calls (tools/call) execute across
 * the standardized Model Context Protocol JSON-RPC boundary.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class McpAgentExecutor {

    private final McpClient mcpClient;
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
                You are a SEBI-registered Portfolio Advisory AI Copilot communicating via the Model Context Protocol (MCP).
                All tools are provided dynamically via MCP tools/list and executed over JSON-RPC tools/call.
                """;

        // Discover tools dynamically via MCP Client tools/list
        List<McpProtocol.McpToolDefinition> mcpTools = mcpClient.listTools();
        List<Map<String, Object>> functionDeclarations = mcpTools.stream()
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
                    log.info("MCP Agent Step {}: Invoking tools/call for '{}' with arguments {}", step, toolName, toolArgs);

                    contents.add(Map.of(
                            "role", "model",
                            "parts", List.of(Map.of(
                                    "functionCall", Map.of(
                                            "name", toolName,
                                            "args", toolArgs
                                    )
                            ))
                    ));

                    // Execute across the MCP Client / Server boundary
                    McpProtocol.McpCallToolResult callResult = mcpClient.callTool(toolName, toolArgs);
                    long stepDuration = System.currentTimeMillis() - stepStart;

                    String rawResultText = (callResult.content() != null && !callResult.content().isEmpty())
                            ? callResult.content().get(0).text()
                            : "";

                    // If recommendation was staged, inspect payload
                    if ("stage_recommendation_proposal".equals(toolName) && !callResult.isError()) {
                        try {
                            Map<?, ?> outMap = objectMapper.readValue(rawResultText, Map.class);
                            Object recObj = outMap.get("response_object");
                            if (recObj != null) {
                                stagedRecommendation = objectMapper.convertValue(recObj, PortfolioRecommendationResponse.class);
                            }
                        } catch (Exception ignored) {}
                    }

                    PiiTokenizationResult tokenizedResult = piiGateway.tokenize(rawResultText, client, profile);

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
                            !callResult.isError(),
                            rawResultText,
                            stepDuration
                    ));

                    meterRegistry.counter("agent_tool_calls_total", "tool", toolName, "mode", "mcp").increment();

                } else {
                    String rawSummary = modelResponse.text() != null ? modelResponse.text() : "MCP Agent run completed.";
                    String rehydrated = piiGateway.rehydrateWithEntity(rawSummary, client, profile);

                    long totalDuration = System.currentTimeMillis() - startTime;
                    sample.stop(Timer.builder("agent_execution_duration_seconds")
                            .tag("mode", "mcp")
                            .tag("status", "success")
                            .register(meterRegistry));
                    meterRegistry.counter("agent_runs_total", "mode", "mcp", "status", "success").increment();

                    Map<String, Object> telemetry = Map.of(
                            "total_duration_ms", totalDuration,
                            "steps_count", stepRecords.size(),
                            "mode", "mcp",
                            "protocol", "JSON-RPC 2.0"
                    );

                    return AgentExecutionResult.success(
                            AgentMode.MCP,
                            rehydrated,
                            stepRecords,
                            stagedRecommendation,
                            telemetry
                    );
                }
            }

            return AgentExecutionResult.failure(
                    AgentMode.MCP,
                    "MCP Agent reached step limit (" + MAX_STEPS + ") without completion.",
                    stepRecords,
                    Map.of("total_duration_ms", System.currentTimeMillis() - startTime, "steps_count", stepRecords.size())
            );

        } catch (Exception e) {
            log.error("Fatal error during MCP Agent execution: {}", e.getMessage(), e);
            meterRegistry.counter("agent_runs_total", "mode", "mcp", "status", "error").increment();

            return AgentExecutionResult.failure(
                    AgentMode.MCP,
                    "MCP Agent execution failed: " + e.getMessage(),
                    stepRecords,
                    Map.of("total_duration_ms", System.currentTimeMillis() - startTime, "steps_count", stepRecords.size())
            );
        }
    }
}
