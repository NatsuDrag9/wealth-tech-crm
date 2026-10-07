export interface AgentRunRequestDto {
  clientId: string;
  portfolioReviewId?: string | null;
  flowType?: 'REPLACE_FUNDS' | 'NEW_PORTFOLIO';
  userGoal?: string;
  agentMode?: 'vanilla' | 'framework' | 'mcp';
}

export interface AgentStepTraceDto {
  stepNumber: number;
  thought?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: Record<string, unknown>;
  durationMs: number;
  status: 'SUCCESS' | 'FAILURE';
}

export interface ProposedAllocationDto {
  eligibleFundId: string;
  fundName: string;
  isin: string;
  scoreCategory: string;
  amount: number;
  replacesEntryId?: string;
  rationale: string;
}

export interface RecommendationDraftDto {
  clientId: string;
  portfolioReviewId?: string;
  flowType: string;
  scoreCategory: string;
  totalInvestable: number;
  allocations: ProposedAllocationDto[];
  executiveSummary: string;
  compliancePassed: boolean;
}

export interface AgentRunResponseDto {
  status: 'SUCCESS' | 'FAILED' | 'MAX_STEPS_EXCEEDED';
  recommendationDraft?: RecommendationDraftDto;
  traces: AgentStepTraceDto[];
  totalSteps: number;
  totalDurationMs: number;
  llmCalls: number;
  toolCalls: number;
  agentMode: 'vanilla' | 'framework' | 'mcp';
  message: string;
}
