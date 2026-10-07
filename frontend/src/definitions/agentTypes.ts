import type { AgentMode } from '@/config/agentConfig';
import type { PortfolioRecommendation, RecommendationFlowType } from './portfolioTypes';

export type AgentStatus = 'SUCCESS' | 'FAILED' | 'MAX_STEPS_EXCEEDED';

export interface AgentRunRequest {
  clientId: string;
  portfolioReviewId?: string | null;
  flowType?: RecommendationFlowType;
  userGoal?: string;
  agentMode: AgentMode;
}

export interface AgentStepTrace {
  step: number;
  toolName?: string;
  arguments?: Record<string, unknown>;
  success?: boolean;
  observation?: string;
  durationMs: number;
}

export interface AgentProposedAllocation {
  eligibleFundId?: string | number;
  fundName?: string;
  isin?: string;
  scoreCategory?: string;
  amount: number;
  replacesEntryId?: string | number;
  rationale?: string;
}

export interface AgentRecommendationDraft {
  clientId?: string | number;
  portfolioReviewId?: string | number;
  flowType?: string;
  scoreCategory?: string;
  totalInvestable?: number;
  allocations: AgentProposedAllocation[];
  executiveSummary?: string;
  compliancePassed?: boolean;
}

export interface AgentExecutionResult {
  success: boolean;
  status: AgentStatus;
  agentMode: AgentMode;
  summary: string;
  toolSteps: AgentStepTrace[];
  stagedRecommendation?: PortfolioRecommendation | null;
  recommendationDraft?: AgentRecommendationDraft | null;
  telemetry?: Record<string, unknown>;
  errorMessage?: string | null;
  totalDurationMs?: number;
}

// Strict Wire Types representing raw backend responses
export interface RawAgentStepWire {
  step?: number;
  step_number?: number;
  stepNumber?: number;
  tool_name?: string;
  toolName?: string;
  action?: string;
  arguments?: Record<string, unknown>;
  tool_input?: Record<string, unknown>;
  toolInput?: Record<string, unknown>;
  success?: boolean;
  status?: string;
  error?: string;
  observation?: string | Record<string, unknown>;
  tool_output?: string | Record<string, unknown>;
  toolOutput?: string | Record<string, unknown>;
  duration_ms?: number;
  durationMs?: number;
}

export interface RawAgentFundWire {
  id?: string | number;
  eligible_fund_id?: string | number;
  eligibleFundId?: string | number;
  fund_name?: string;
  fundName?: string;
  isin?: string;
  fund_subcategory?: string;
  fundSubCategory?: string;
  asset_class?: string;
  assetClass?: string;
  instrument_type?: string;
  instrumentType?: string;
  score_category?: string;
  scoreCategory?: string;
  amount?: number;
  replaces_entry_id?: string | number;
  replacesEntryId?: string | number;
  display_order?: number;
  displayOrder?: number;
  rationale?: string;
}

export interface RawAgentDraftWire {
  client_id?: string | number;
  clientId?: string | number;
  portfolio_review_id?: string | number;
  portfolioReviewId?: string | number;
  flow_type?: string;
  flowType?: string;
  score_category?: string;
  scoreCategory?: string;
  total_investable?: number;
  totalInvestable?: number;
  allocations?: RawAgentFundWire[];
  executive_summary?: string;
  executiveSummary?: string;
  compliance_passed?: boolean;
  compliancePassed?: boolean;
}

export interface RawAgentStagedWire {
  id?: string | number;
  client_id?: string | number;
  clientId?: string | number;
  portfolio_review_id?: string | number;
  portfolioReviewId?: string | number;
  flow_type?: string;
  flowType?: string;
  status?: string;
  investor_category?: string;
  investorCategory?: string;
  generated_document_url?: string;
  generatedDocumentUrl?: string;
  created_at?: string;
  createdAt?: string;
  funds?: RawAgentFundWire[];
}

export interface RawAgentExecutionWire {
  success?: boolean;
  status?: string;
  agent_mode?: string;
  agentMode?: string;
  summary?: string;
  message?: string;
  tool_steps?: RawAgentStepWire[];
  traces?: RawAgentStepWire[];
  staged_recommendation?: RawAgentStagedWire;
  recommendation_draft?: RawAgentDraftWire;
  recommendationDraft?: RawAgentDraftWire;
  telemetry?: Record<string, unknown>;
  error_message?: string;
  errorMessage?: string;
  total_duration_ms?: number;
  totalDurationMs?: number;
}
