import { baseApi } from './baseApi';
import { ENDPOINTS } from '@/constants/endpoints';
import type {
  AgentRunRequest,
  AgentExecutionResult,
  AgentStepTrace,
  AgentProposedAllocation,
  AgentRecommendationDraft,
  RawAgentExecutionWire,
  RawAgentStepWire,
  RawAgentFundWire,
  RawAgentDraftWire,
  RawAgentStagedWire,
} from '@/definitions/agentTypes';
import type {
  PortfolioRecommendation,
  RecommendationFlowType,
} from '@/definitions/portfolioTypes';

function normalizeStepTrace(raw: RawAgentStepWire, index: number): AgentStepTrace {
  return {
    step: Number(raw.step ?? raw.step_number ?? raw.stepNumber ?? index + 1),
    toolName: raw.tool_name ?? raw.toolName ?? raw.action,
    arguments: raw.arguments ?? raw.tool_input ?? raw.toolInput ?? {},
    success: typeof raw.success === 'boolean'
      ? raw.success
      : (raw.status === 'SUCCESS' || !raw.error),
    observation: typeof raw.observation === 'string'
      ? raw.observation
      : JSON.stringify(raw.observation ?? raw.tool_output ?? raw.toolOutput ?? ''),
    durationMs: Number(raw.duration_ms ?? raw.durationMs ?? 0),
  };
}

function normalizeDraft(rawDraft?: RawAgentDraftWire): AgentRecommendationDraft | null {
  if (!rawDraft) return null;
  const allocations: AgentProposedAllocation[] = (
    rawDraft.allocations ?? []
  ).map((a: RawAgentFundWire) => ({
    eligibleFundId: a.eligible_fund_id ?? a.eligibleFundId,
    fundName: a.fund_name ?? a.fundName,
    isin: a.isin,
    scoreCategory: a.score_category ?? a.scoreCategory,
    amount: Number(a.amount ?? 0),
    replacesEntryId: a.replaces_entry_id ?? a.replacesEntryId,
    rationale: a.rationale ?? '',
  }));

  return {
    clientId: rawDraft.client_id ?? rawDraft.clientId,
    portfolioReviewId: rawDraft.portfolio_review_id ?? rawDraft.portfolioReviewId,
    flowType: rawDraft.flow_type ?? rawDraft.flowType,
    scoreCategory: rawDraft.score_category ?? rawDraft.scoreCategory,
    totalInvestable: Number(rawDraft.total_investable ?? rawDraft.totalInvestable ?? 0),
    allocations,
    executiveSummary: rawDraft.executive_summary ?? rawDraft.executiveSummary ?? '',
    compliancePassed: Boolean(rawDraft.compliance_passed ?? rawDraft.compliancePassed ?? true),
  };
}

function resolveStatus(status?: string, isSuccess = false) {
  if (status === 'SUCCESS' || status === 'MAX_STEPS_EXCEEDED') {
    return status;
  }
  return isSuccess ? 'SUCCESS' : 'FAILED';
}

function resolveMode(mode?: string, altMode?: string) {
  const target = mode ?? altMode;
  if (target === 'framework' || target === 'mcp') {
    return target;
  }
  return 'vanilla';
}

function normalizeAgentResult(res: RawAgentExecutionWire): AgentExecutionResult {
  if (!res) {
    return {
      success: false,
      status: 'FAILED',
      agentMode: 'vanilla',
      summary: 'Empty response returned from agent',
      toolSteps: [],
      errorMessage: 'Empty response payload',
    };
  }

  const rawSteps = res.tool_steps ?? res.traces ?? [];
  const toolSteps: AgentStepTrace[] = rawSteps.map(normalizeStepTrace);

  const rawDraft = res.staged_recommendation ?? res.recommendation_draft ?? res.recommendationDraft;
  const recommendationDraft = normalizeDraft(rawDraft);

  const rawStaged: RawAgentStagedWire | undefined = res.staged_recommendation;
  const flowTypeVal: RecommendationFlowType = (
    rawStaged?.flow_type === 'NEW_PORTFOLIO' || rawStaged?.flowType === 'NEW_PORTFOLIO'
      ? 'NEW_PORTFOLIO'
      : 'REPLACE_FUNDS'
  );

  const statusVal = rawStaged?.status === 'PDF_GENERATED'
    || rawStaged?.status === 'PDF_FAILED'
    ? rawStaged.status
    : 'SAVED';

  const stagedRecommendation: PortfolioRecommendation | null = rawStaged
    ? {
      id: rawStaged.id ?? 'staged-draft',
      clientId: rawStaged.client_id ?? rawStaged.clientId ?? '',
      portfolioReviewId: rawStaged.portfolio_review_id ?? rawStaged.portfolioReviewId,
      flowType: flowTypeVal,
      status: statusVal,
      investorCategory: rawStaged.investor_category ?? rawStaged.investorCategory,
      generatedDocumentUrl: rawStaged.generated_document_url ?? rawStaged.generatedDocumentUrl,
      createdAt: rawStaged.created_at ?? rawStaged.createdAt ?? new Date().toISOString(),
      funds: (rawStaged.funds ?? []).map((f: RawAgentFundWire, idx: number) => ({
        id: f.id ?? idx + 1,
        eligibleFund: {
          id: f.eligible_fund_id ?? f.eligibleFundId ?? f.id ?? idx + 1,
          fundName: f.fund_name ?? f.fundName ?? '',
          isin: f.isin ?? '',
          fundSubCategory: f.fund_subcategory ?? f.fundSubCategory ?? '',
          assetClass: f.asset_class ?? f.assetClass ?? '',
          instrumentType: f.instrument_type ?? f.instrumentType ?? '',
          scoreCategory: f.score_category ?? f.scoreCategory ?? null,
        },
        amount: Number(f.amount ?? 0),
        replacesEntryId: f.replaces_entry_id ?? f.replacesEntryId ?? null,
        displayOrder: f.display_order ?? f.displayOrder ?? idx + 1,
      })),
    }
    : null;

  const isSuccess = Boolean(
    res.success !== undefined
      ? res.success
      : (res.status === 'SUCCESS' || Boolean(stagedRecommendation || recommendationDraft)),
  );

  const durationMs = Number(
    res.telemetry?.total_duration_ms
    ?? res.total_duration_ms
    ?? res.totalDurationMs
    ?? 0,
  );

  const resolvedStatus = resolveStatus(res.status, isSuccess);
  const resolvedMode = resolveMode(res.agent_mode, res.agentMode);

  const defaultSummary = isSuccess
    ? 'Advisory recommendation successfully staged.'
    : 'Execution failed.';

  return {
    success: isSuccess,
    status: resolvedStatus,
    agentMode: resolvedMode,
    summary: res.summary ?? res.message ?? defaultSummary,
    toolSteps,
    stagedRecommendation,
    recommendationDraft,
    telemetry: res.telemetry ?? {},
    errorMessage: res.error_message ?? res.errorMessage ?? null,
    totalDurationMs: durationMs,
  };
}

export const agentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    runAgent: builder.mutation<AgentExecutionResult, AgentRunRequest>({
      query: (body) => ({
        url: ENDPOINTS.AGENT_RUN,
        method: 'POST',
        body: {
          clientId: body.clientId,
          client_id: body.clientId,
          portfolioReviewId: body.portfolioReviewId,
          portfolio_review_id: body.portfolioReviewId,
          flowType: body.flowType,
          flow_type: body.flowType,
          userGoal: body.userGoal,
          user_goal: body.userGoal,
          reviewFeedback: body.reviewFeedback,
          review_feedback: body.reviewFeedback,
          previousProposalId: body.previousProposalId,
          previous_proposal_id: body.previousProposalId,
          agentMode: body.agentMode,
          agent_mode: body.agentMode,
        },
      }),
      transformResponse: (response: RawAgentExecutionWire) => normalizeAgentResult(response),
      invalidatesTags: ['PortfolioReview', 'PortfolioRecommendation'],
    }),
  }),
});

export const { useRunAgentMutation } = agentApi;
