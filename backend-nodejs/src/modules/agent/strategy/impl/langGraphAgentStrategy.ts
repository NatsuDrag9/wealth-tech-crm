import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { AgentMode, AgentStatus } from '../../enums/agentEnums';
import {
  AgentRunRequestDto,
  AgentRunResponseDto,
  AgentStepTraceDto,
  RecommendationDraftDto,
} from '../../dto/agentDto';
import { IAgentStrategy } from '../agentStrategy';
import { AgentContext } from '../../tools/types';
import { toolRegistry } from '../../tools/toolRegistry';
import { config } from '../../../../config/environment';
import { logger } from '../../../../common/utils/logger';
import { agentExecutionIterations, agentToolCallsTotal } from '../../../../common/metrics/metrics';
import { geminiGenerationService } from '../../../../common/services/geminiGenerationService';

// LangGraph State Annotation Schema
export const AgentGraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  clientId: Annotation<string>(),
  portfolioReviewId: Annotation<string | undefined>(),
  flowType: Annotation<'REPLACE_FUNDS' | 'NEW_PORTFOLIO'>(),
  userGoal: Annotation<string>(),
  traces: Annotation<AgentStepTraceDto[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  recommendationDraft: Annotation<RecommendationDraftDto | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  currentToolCall: Annotation<{ name: string; args: Record<string, unknown> } | undefined>({
    reducer: (x, y) => y,
    default: () => undefined,
  }),
  stepCount: Annotation<number>({
    reducer: (x, y) => y,
    default: () => 0,
  }),
  isFinished: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),
  scoreCategory: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => 'MODERATE',
  }),
  totalInvestable: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 100000,
  }),
  sellHoldings: Annotation<Array<Record<string, unknown>>>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  candidateFunds: Annotation<Array<Record<string, unknown>>>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  llmCalls: Annotation<number>({
    reducer: (x, y) => x + y,
    default: () => 0,
  }),
  toolCalls: Annotation<number>({
    reducer: (x, y) => x + y,
    default: () => 0,
  }),
});

export type AgentGraphStateType = typeof AgentGraphState.State;

export class LangGraphAgentStrategy implements IAgentStrategy {
  public readonly mode = AgentMode.FRAMEWORK;
  private static readonly MAX_STEPS = 8;

  public async execute(request: AgentRunRequestDto): Promise<AgentRunResponseDto> {
    const startTime = Date.now();
    const clientId = request.clientId;
    const portfolioReviewId = request.portfolioReviewId || undefined;
    const flowType: 'REPLACE_FUNDS' | 'NEW_PORTFOLIO' =
      request.flowType === 'NEW_PORTFOLIO' ? 'NEW_PORTFOLIO' : 'REPLACE_FUNDS';
    const userGoal =
      request.userGoal ||
      'Coordinate autonomous portfolio advisory rebalancing by retrieving client KYC profile, assessing risk appetite, reviewing existing holdings, performing RAG evidence retrieval, and staging a compliant recommendation draft proposal.';

    logger.info({ clientId, flowType, mode: this.mode }, 'Compiling and initiating LangGraph StateGraph agent execution...');

    const compiledGraph = this.buildStateGraph();

    const initialState: AgentGraphStateType = {
      messages: [new HumanMessage(userGoal)],
      clientId,
      portfolioReviewId,
      flowType,
      userGoal,
      traces: [],
      recommendationDraft: undefined,
      currentToolCall: undefined,
      stepCount: 0,
      isFinished: false,
      scoreCategory: 'MODERATE',
      totalInvestable: 100000,
      sellHoldings: [],
      candidateFunds: [],
      llmCalls: 0,
      toolCalls: 0,
    };

    let finalState: AgentGraphStateType;
    try {
      finalState = (await compiledGraph.invoke(initialState)) as AgentGraphStateType;
    } catch (error: unknown) {
      logger.error({ err: error, clientId }, 'Error during LangGraph state graph execution');
      return {
        status: AgentStatus.FAILED,
        traces: [],
        totalSteps: 0,
        totalDurationMs: Date.now() - startTime,
        llmCalls: 0,
        toolCalls: 0,
        agentMode: this.mode,
        message: 'LangGraph StateGraph workflow encountered an unrecoverable execution failure.',
      };
    }

    const totalDurationMs = Date.now() - startTime;
    agentExecutionIterations.observe({ agent_name: 'LangGraphPortfolioCoordinator' }, finalState.traces.length);

    const isSuccess = !!finalState.recommendationDraft && finalState.recommendationDraft.allocations.length > 0;
    const status = isSuccess
      ? AgentStatus.SUCCESS
      : finalState.traces.length >= LangGraphAgentStrategy.MAX_STEPS
      ? AgentStatus.MAX_STEPS_EXCEEDED
      : AgentStatus.FAILED;

    logger.info(
      { clientId, status, totalSteps: finalState.traces.length, totalDurationMs },
      'LangGraph StateGraph agent workflow execution completed'
    );

    return {
      status,
      recommendationDraft: finalState.recommendationDraft,
      traces: finalState.traces,
      totalSteps: finalState.traces.length,
      totalDurationMs,
      llmCalls: finalState.llmCalls,
      toolCalls: finalState.toolCalls,
      agentMode: this.mode,
      message: isSuccess
        ? 'LangGraph agent successfully converged on compliant recommendation draft proposal.'
        : 'LangGraph agent terminated without formulating a complete recommendation draft.',
    };
  }

  private buildStateGraph() {
    const workflow = new StateGraph(AgentGraphState)
      .addNode('agentReasoningNode', this.agentReasoningNode.bind(this))
      .addNode('toolExecutionNode', this.toolExecutionNode.bind(this))
      .addEdge(START, 'agentReasoningNode')
      .addConditionalEdges('agentReasoningNode', this.shouldContinue.bind(this), {
        tools: 'toolExecutionNode',
        end: END,
      })
      .addEdge('toolExecutionNode', 'agentReasoningNode');

    return workflow.compile();
  }

  private async agentReasoningNode(state: AgentGraphStateType): Promise<Partial<AgentGraphStateType>> {
    const currentStep = state.stepCount;

    if (state.isFinished || state.recommendationDraft || currentStep >= LangGraphAgentStrategy.MAX_STEPS) {
      return { isFinished: true };
    }

    const context: AgentContext = {
      clientId: state.clientId,
      portfolioReviewId: state.portfolioReviewId,
      flowType: state.flowType,
      userGoal: state.userGoal,
    };

    if (geminiGenerationService.isLiveKeyConfigured()) {
      return this.executeLiveGeminiReasoning(state, context);
    } else {
      return this.executeFrameworkReasoning(state, context);
    }
  }

  private async executeLiveGeminiReasoning(
    state: AgentGraphStateType,
    context: AgentContext
  ): Promise<Partial<AgentGraphStateType>> {
    const systemInstruction = `You are an Autonomous Portfolio Copilot Coordinator operating inside a LangGraph StateGraph framework.
Your objective is to advise Relationship Managers by formulating an optimal, SEBI-compliant mutual fund restructuring proposal for client ${context.clientId}.
Follow this sequence:
1. getClientDetails -> KYC & Identity verification
2. getRiskProfile -> Risk category assessment (e.g. CONSERVATIVE, MODERATE, AGGRESSIVE)
3. getPortfolioHoldings -> Inspect eCAS line items & exit proceeds
4. searchEligibleFunds -> Hybrid RAG factsheet disclosures
5. stageDraftProposal -> Final allocation proposal`;

    const functionDeclarations = toolRegistry.getGeminiFunctionDeclarations();
    const contents: Array<Record<string, unknown>> = state.messages.map((m) => {
      if (m instanceof HumanMessage) {
        return { role: 'user', parts: [{ text: m.content as string }] };
      } else if (m instanceof AIMessage) {
        return { role: 'model', parts: [{ text: (m.content as string) || '' }] };
      } else {
        return { role: 'function', parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }] };
      }
    });

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
        logger.warn({ status: response.status }, 'Live Gemini API call failed in LangGraph agent node, falling back to framework transition');
        return this.executeFrameworkReasoning(state, context);
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
              functionCall?: { name: string; args: Record<string, unknown> };
            }>;
          };
        }>;
      };

      const parts = data.candidates?.[0]?.content?.parts || [];
      const functionCallPart = parts.find((p) => p.functionCall);
      const textPart = parts.find((p) => p.text);

      if (functionCallPart && functionCallPart.functionCall) {
        const { name, args } = functionCallPart.functionCall;
        return {
          currentToolCall: { name, args: args || {} },
          messages: [new AIMessage(textPart?.text || `Planning invocation of tool ${name}`)],
          llmCalls: 1,
        };
      } else {
        return {
          isFinished: true,
          messages: [new AIMessage(textPart?.text || 'Agent reasoning completed.')],
          llmCalls: 1,
        };
      }
    } catch (error: unknown) {
      logger.error({ err: error }, 'Error in LangGraph live Gemini reasoning node');
      return this.executeFrameworkReasoning(state, context);
    }
  }

  private async executeFrameworkReasoning(
    state: AgentGraphStateType,
    _context: AgentContext
  ): Promise<Partial<AgentGraphStateType>> {
    const executedTools = state.traces.map((t) => t.toolName);

    if (!executedTools.includes('getClientDetails')) {
      return {
        currentToolCall: { name: 'getClientDetails', args: { clientId: state.clientId } },
        messages: [new AIMessage('LangGraph: Planning client identity and KYC profile retrieval.')],
        llmCalls: 1,
      };
    }

    if (!executedTools.includes('getRiskProfile')) {
      return {
        currentToolCall: { name: 'getRiskProfile', args: { clientId: state.clientId } },
        messages: [new AIMessage('LangGraph: Planning risk appetite profile assessment.')],
        llmCalls: 1,
      };
    }

    if (!executedTools.includes('getPortfolioHoldings')) {
      return {
        currentToolCall: { name: 'getPortfolioHoldings', args: { portfolioReviewId: state.portfolioReviewId } },
        messages: [new AIMessage('LangGraph: Planning eCAS portfolio review and SELL holdings analysis.')],
        llmCalls: 1,
      };
    }

    if (!executedTools.includes('searchEligibleFunds')) {
      return {
        currentToolCall: {
          name: 'searchEligibleFunds',
          args: { query: `${state.scoreCategory} mutual fund replacement factsheet`, scoreCategory: state.scoreCategory, topK: 5 },
        },
        messages: [new AIMessage('LangGraph: Planning hybrid RAG factsheet and regulatory evidence search.')],
        llmCalls: 1,
      };
    }

    if (!executedTools.includes('stageDraftProposal')) {
      const totalInvestable = state.totalInvestable || 100000;
      const candidateFunds = state.candidateFunds || [];
      const sellHoldings = state.sellHoldings || [];

      const proposedAllocations = [];
      if (candidateFunds.length > 0) {
        const splitAmount = Math.round(totalInvestable / Math.min(candidateFunds.length, 2));
        for (let i = 0; i < Math.min(candidateFunds.length, 2); i++) {
          const fund = candidateFunds[i];
          proposedAllocations.push({
            eligibleFundId: String(fund.eligibleFundId || '663e00000000000000000001'),
            fundName: String(fund.fundName || 'Parag Parikh Flexi Cap Fund'),
            isin: String(fund.isin || 'INF879O01019'),
            scoreCategory: String(fund.scoreCategory || state.scoreCategory),
            amount: splitAmount,
            replacesEntryId: sellHoldings[i]?.entryId ? String(sellHoldings[i].entryId) : undefined,
            rationale: `Grounded replacement matching ${state.scoreCategory} suitability with verified factsheet disclosures [Source ${i + 1}].`,
          });
        }
      } else {
        proposedAllocations.push({
          eligibleFundId: '663e00000000000000000001',
          fundName: 'Parag Parikh Flexi Cap Fund',
          isin: 'INF879O01019',
          scoreCategory: state.scoreCategory,
          amount: totalInvestable,
          rationale: `Core diversified equity allocation matching ${state.scoreCategory} risk tolerance.`,
        });
      }

      return {
        currentToolCall: {
          name: 'stageDraftProposal',
          args: {
            totalInvestable,
            executiveSummary: `LangGraph framework recommendation proposal: Rebalancing ₹${totalInvestable.toLocaleString(
              'en-IN'
            )} into suitable ${state.scoreCategory} schemes backed by grounded evidence disclosures.`,
            allocations: proposedAllocations,
          },
        },
        messages: [new AIMessage('LangGraph: Planning staging of final advisory recommendation proposal draft.')],
        llmCalls: 1,
      };
    }

    return {
      isFinished: true,
      messages: [new AIMessage('LangGraph: Advisory workflow converged.')],
    };
  }

  private async toolExecutionNode(state: AgentGraphStateType): Promise<Partial<AgentGraphStateType>> {
    const toolCall = state.currentToolCall;
    if (!toolCall) {
      return { stepCount: state.stepCount + 1 };
    }

    const { name, args } = toolCall;
    const stepNumber = state.stepCount + 1;
    const startTime = Date.now();

    agentToolCallsTotal.inc({ agent_name: 'LangGraphPortfolioCoordinator', tool_name: name, status: 'invoked' });

    const context: AgentContext = {
      clientId: state.clientId,
      portfolioReviewId: state.portfolioReviewId,
      flowType: state.flowType,
      userGoal: state.userGoal,
    };

    const toolResult = await toolRegistry.executeTool(name, args, context);
    const durationMs = Date.now() - startTime;

    const trace: AgentStepTraceDto = {
      stepNumber,
      thought: `LangGraph executed tool '${name}' to advance advisory state.`,
      toolName: name,
      toolInput: args,
      toolOutput: toolResult,
      durationMs,
      status: toolResult.error ? 'FAILURE' : 'SUCCESS',
    };

    const patch: Partial<AgentGraphStateType> = {
      traces: [trace],
      currentToolCall: undefined,
      stepCount: stepNumber,
      toolCalls: 1,
      messages: [new ToolMessage({ content: JSON.stringify(toolResult), tool_call_id: name })],
    };

    // State mutations based on tool output
    if (name === 'getRiskProfile' && toolResult.scoreCategory) {
      patch.scoreCategory = String(toolResult.scoreCategory);
    } else if (name === 'getPortfolioHoldings') {
      if (typeof toolResult.totalSellProceeds === 'number' && toolResult.totalSellProceeds > 0) {
        patch.totalInvestable = toolResult.totalSellProceeds;
      }
      if (Array.isArray(toolResult.sellHoldings)) {
        patch.sellHoldings = toolResult.sellHoldings as Array<Record<string, unknown>>;
      }
    } else if (name === 'searchEligibleFunds' && Array.isArray(toolResult.candidateFunds)) {
      patch.candidateFunds = toolResult.candidateFunds as Array<Record<string, unknown>>;
    } else if (name === 'stageDraftProposal' && toolResult.staged && toolResult.draft) {
      patch.recommendationDraft = toolResult.draft as RecommendationDraftDto;
      patch.isFinished = true;
    }

    return patch;
  }

  private shouldContinue(state: AgentGraphStateType): 'tools' | 'end' {
    if (state.isFinished || state.recommendationDraft || state.stepCount >= LangGraphAgentStrategy.MAX_STEPS) {
      return 'end';
    }
    if (state.currentToolCall) {
      return 'tools';
    }
    return 'end';
  }
}

export const langGraphAgentStrategy = new LangGraphAgentStrategy();
