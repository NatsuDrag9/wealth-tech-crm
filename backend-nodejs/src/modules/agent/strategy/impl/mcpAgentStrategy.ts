import { AgentMode, AgentStatus } from '../../enums/agentEnums';
import {
  AgentRunRequestDto,
  AgentRunResponseDto,
  AgentStepTraceDto,
  RecommendationDraftDto,
} from '../../dto/agentDto';
import { IAgentStrategy } from '../agentStrategy';
import { portfolioMcpClient } from '../../mcp/portfolioMcpClient';
import { config } from '../../../../config/environment';
import { logger } from '../../../../common/utils/logger';
import { agentExecutionIterations, agentToolCallsTotal } from '../../../../common/metrics/metrics';
import { geminiGenerationService } from '../../../../common/services/geminiGenerationService';

export class McpAgentStrategy implements IAgentStrategy {
  public readonly mode = AgentMode.MCP;
  private static readonly MAX_STEPS = 8;

  public async execute(request: AgentRunRequestDto): Promise<AgentRunResponseDto> {
    const startTime = Date.now();
    const clientId = request.clientId;
    const portfolioReviewId = request.portfolioReviewId || undefined;
    const flowType = request.flowType || 'REPLACE_FUNDS';
    const userGoal =
      request.userGoal ||
      'Coordinate autonomous portfolio advisory rebalancing by executing tools over a standardized MCP boundary.';

    logger.info({ clientId, flowType, mode: this.mode }, 'Initiating MCP Agent Strategy execution across MCP boundary...');

    // Ensure MCP Client connection is initialized
    await portfolioMcpClient.connect();

    const traces: AgentStepTraceDto[] = [];
    let stagedDraft: RecommendationDraftDto | undefined;
    let llmCalls = 0;
    let toolCalls = 0;

    if (geminiGenerationService.isLiveKeyConfigured()) {
      const result = await this.executeGeminiMcpLoop(clientId, portfolioReviewId, flowType, userGoal, traces);
      stagedDraft = result.stagedDraft;
      llmCalls = result.llmCalls;
      toolCalls = result.toolCalls;
    } else {
      const result = await this.executeDeterministicMcpLoop(clientId, portfolioReviewId, traces);
      stagedDraft = result.stagedDraft;
      llmCalls = 1;
      toolCalls = result.toolCalls;
    }

    const totalDurationMs = Date.now() - startTime;
    agentExecutionIterations.observe({ agent_name: 'McpPortfolioCoordinator' }, traces.length);

    const isSuccess = !!stagedDraft && stagedDraft.allocations.length > 0;
    const status = isSuccess
      ? AgentStatus.SUCCESS
      : traces.length >= McpAgentStrategy.MAX_STEPS
      ? AgentStatus.MAX_STEPS_EXCEEDED
      : AgentStatus.FAILED;

    logger.info(
      { clientId, status, totalSteps: traces.length, totalDurationMs },
      'MCP Agent Strategy execution completed'
    );

    return {
      status,
      recommendationDraft: stagedDraft,
      traces,
      totalSteps: traces.length,
      totalDurationMs,
      llmCalls,
      toolCalls,
      agentMode: this.mode,
      message: isSuccess
        ? 'MCP Agent successfully formulated and staged recommendation draft proposal across MCP boundary.'
        : 'MCP Agent execution finished without completing a valid recommendation draft.',
    };
  }

  private async executeGeminiMcpLoop(
    clientId: string,
    portfolioReviewId: string | undefined,
    flowType: string,
    userGoal: string,
    traces: AgentStepTraceDto[]
  ): Promise<{ stagedDraft?: RecommendationDraftDto; llmCalls: number; toolCalls: number }> {
    let llmCalls = 0;
    let toolCalls = 0;
    let stagedDraft: RecommendationDraftDto | undefined;

    const systemInstruction = `You are an Autonomous Portfolio Copilot Coordinator communicating with domain microservices exclusively via Model Context Protocol (MCP).
Your objective is to advise Relationship Managers by formulating an optimal, compliant portfolio restructuring recommendation proposal for client ${clientId}.
Available MCP Tools: getClientDetails, getRiskProfile, getPortfolioHoldings, searchEligibleFunds, stageDraftProposal.`;

    // Fetch tool declarations from MCP Client
    const mcpTools = await portfolioMcpClient.listTools();
    const functionDeclarations = mcpTools.map((t) => ({
      name: t.name,
      description: t.description || '',
      parameters: {
        type: 'OBJECT',
        properties: (t.inputSchema?.properties as Record<string, unknown>) || {},
        required: (t.inputSchema?.required as string[]) || [],
      },
    }));

    const contents: Array<Record<string, unknown>> = [
      {
        role: 'user',
        parts: [{ text: userGoal }],
      },
    ];

    let step = 0;

    while (step < McpAgentStrategy.MAX_STEPS) {
      step++;
      const stepStartTime = Date.now();
      llmCalls++;

      try {
        const payload = {
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          tools: [{ functionDeclarations }],
          generationConfig: {
            temperature: config.gemini.generationTemperature,
            maxOutputTokens: 2048,
          },
        };

        const endpoint = `${config.gemini.apiBaseUrl}/${config.gemini.generationModel}:generateContent?key=${config.gemini.apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.gemini.requestTimeoutMs);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          logger.warn({ status: response.status }, 'Gemini API call failed in MCP Agent loop');
          break;
        }

        const data = (await response.json()) as {
          candidates?: Array<{
            content?: {
              role?: string;
              parts?: Array<{
                text?: string;
                functionCall?: { name: string; args: Record<string, unknown> };
              }>;
            };
          }>;
        };

        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const functionCallPart = parts.find((p) => p.functionCall);
        const textPart = parts.find((p) => p.text);

        if (functionCallPart && functionCallPart.functionCall) {
          const { name, args } = functionCallPart.functionCall;
          toolCalls++;
          agentToolCallsTotal.inc({ agent_name: 'McpPortfolioCoordinator', tool_name: name, status: 'invoked' });

          const toolArgs = {
            ...args,
            clientId: args.clientId || clientId,
            portfolioReviewId: args.portfolioReviewId || portfolioReviewId,
            flowType: args.flowType || flowType,
          };

          // Execute tool over MCP protocol boundary
          const toolResult = await portfolioMcpClient.callTool(name, toolArgs);

          if (name === 'stageDraftProposal' && toolResult.staged && toolResult.draft) {
            stagedDraft = toolResult.draft as RecommendationDraftDto;
          }

          traces.push({
            stepNumber: step,
            thought: textPart?.text || `Executing tool '${name}' via Model Context Protocol (MCP)`,
            toolName: name,
            toolInput: toolArgs,
            toolOutput: toolResult,
            durationMs: Date.now() - stepStartTime,
            status: toolResult.error ? 'FAILURE' : 'SUCCESS',
          });

          contents.push({
            role: 'model',
            parts: [{ functionCall: { name, args } }],
          });

          contents.push({
            role: 'function',
            parts: [{ functionResponse: { name, response: { output: toolResult } } }],
          });

          if (name === 'stageDraftProposal' && stagedDraft) {
            break;
          }
        } else {
          if (textPart?.text) {
            traces.push({
              stepNumber: step,
              thought: textPart.text,
              durationMs: Date.now() - stepStartTime,
              status: 'SUCCESS',
            });
          }
          break;
        }
      } catch (error: unknown) {
        logger.error({ err: error, step }, 'Error during MCP Gemini reasoning loop');
        traces.push({
          stepNumber: step,
          thought: 'Encountered error during MCP LLM invocation.',
          durationMs: Date.now() - stepStartTime,
          status: 'FAILURE',
        });
        break;
      }
    }

    return { stagedDraft, llmCalls, toolCalls };
  }

  private async executeDeterministicMcpLoop(
    clientId: string,
    portfolioReviewId: string | undefined,
    traces: AgentStepTraceDto[]
  ): Promise<{ stagedDraft?: RecommendationDraftDto; toolCalls: number }> {
    let toolCalls = 0;
    let step = 1;

    // 1. Fetch Client Profile via MCP
    let tStart = Date.now();
    const clientResult = await portfolioMcpClient.callTool('getClientDetails', { clientId });
    toolCalls++;
    traces.push({
      stepNumber: step++,
      thought: 'MCP Step 1: Querying client identity and KYC compliance status over MCP boundary.',
      toolName: 'getClientDetails',
      toolInput: { clientId },
      toolOutput: clientResult,
      durationMs: Date.now() - tStart,
      status: clientResult.found ? 'SUCCESS' : 'FAILURE',
    });

    // 2. Fetch Risk Profile via MCP
    tStart = Date.now();
    const riskResult = await portfolioMcpClient.callTool('getRiskProfile', { clientId });
    toolCalls++;
    const scoreCategory = String(riskResult.scoreCategory || 'MODERATE');
    traces.push({
      stepNumber: step++,
      thought: `MCP Step 2: Querying client risk appetite profile (${scoreCategory}) over MCP boundary.`,
      toolName: 'getRiskProfile',
      toolInput: { clientId },
      toolOutput: riskResult,
      durationMs: Date.now() - tStart,
      status: 'SUCCESS',
    });

    // 3. Fetch Portfolio Holdings via MCP
    tStart = Date.now();
    const portfolioResult = await portfolioMcpClient.callTool('getPortfolioHoldings', {
      portfolioReviewId,
      clientId,
    });
    toolCalls++;
    const sellHoldings = (portfolioResult.sellHoldings as Array<{ entryId: string; fundName: string; currentValue: number }>) || [];
    const totalInvestable = Number(portfolioResult.totalSellProceeds) || 100000;

    traces.push({
      stepNumber: step++,
      thought: `MCP Step 3: Retrieved ${sellHoldings.length} SELL holdings totaling ₹${totalInvestable.toLocaleString(
        'en-IN'
      )} over MCP boundary.`,
      toolName: 'getPortfolioHoldings',
      toolInput: { portfolioReviewId, clientId },
      toolOutput: portfolioResult,
      durationMs: Date.now() - tStart,
      status: 'SUCCESS',
    });

    // 4. Candidate-Grounded Hybrid RAG Research via MCP
    tStart = Date.now();
    const ragResult = await portfolioMcpClient.callTool('searchEligibleFunds', {
      query: `${scoreCategory} mutual fund replacement factsheet`,
      scoreCategory,
      topK: 5,
      clientId,
    });
    toolCalls++;
    const candidateFunds = (ragResult.candidateFunds as Array<{ eligibleFundId: string; fundName: string; isin: string; scoreCategory: string }>) || [];

    traces.push({
      stepNumber: step++,
      thought: `MCP Step 4: Retrieved ${candidateFunds.length} grounded candidate mutual funds over MCP boundary.`,
      toolName: 'searchEligibleFunds',
      toolInput: { scoreCategory, topK: 5, clientId },
      toolOutput: ragResult,
      durationMs: Date.now() - tStart,
      status: 'SUCCESS',
    });

    // 5. Stage Recommendation Proposal Draft via MCP
    tStart = Date.now();
    const proposedAllocations = [];
    if (candidateFunds.length > 0) {
      const splitAmount = Math.round(totalInvestable / Math.min(candidateFunds.length, 2));
      for (let i = 0; i < Math.min(candidateFunds.length, 2); i++) {
        const fund = candidateFunds[i];
        proposedAllocations.push({
          eligibleFundId: fund.eligibleFundId,
          fundName: fund.fundName,
          isin: fund.isin,
          scoreCategory: fund.scoreCategory,
          amount: splitAmount,
          replacesEntryId: sellHoldings[i]?.entryId,
          rationale: `MCP Grounded recommendation matching ${scoreCategory} suitability [Source ${i + 1}].`,
        });
      }
    } else {
      proposedAllocations.push({
        eligibleFundId: '663e00000000000000000001',
        fundName: 'Parag Parikh Flexi Cap Fund',
        isin: 'INF879O01019',
        scoreCategory,
        amount: totalInvestable,
        rationale: `Core diversified equity allocation matching ${scoreCategory} risk category.`,
      });
    }

    const stageResult = await portfolioMcpClient.callTool('stageDraftProposal', {
      totalInvestable,
      executiveSummary: `MCP Protocol recommendation proposal: Rebalancing ₹${totalInvestable.toLocaleString(
        'en-IN'
      )} into suitable ${scoreCategory} schemes backed by grounded regulatory disclosures.`,
      clientId,
      portfolioReviewId,
      allocations: proposedAllocations,
    });
    toolCalls++;

    const stagedDraft = stageResult.draft as RecommendationDraftDto | undefined;

    traces.push({
      stepNumber: step++,
      thought: 'MCP Step 5: Staged finalized recommendation proposal draft over MCP boundary.',
      toolName: 'stageDraftProposal',
      toolInput: { totalInvestable, allocationsCount: proposedAllocations.length },
      toolOutput: stageResult,
      durationMs: Date.now() - tStart,
      status: stageResult.staged ? 'SUCCESS' : 'FAILURE',
    });

    return { stagedDraft, toolCalls };
  }
}

export const mcpAgentStrategy = new McpAgentStrategy();
