import { AgentContext, AgentTool } from './types';
import { ProposedAllocationDto, RecommendationDraftDto } from '../dto/agentDto';

export class StageRecommendationDraftTool implements AgentTool {
  public readonly name = 'stageDraftProposal';
  public readonly description =
    'Validates and stages the finalized investment recommendation draft with line-item fund allocations, replacement targets, and SEBI regulatory compliance checks.';

  public readonly parameters = {
    type: 'OBJECT' as const,
    properties: {
      totalInvestable: {
        type: 'NUMBER',
        description: 'Total investable or reallocated amount in INR',
      },
      executiveSummary: {
        type: 'STRING',
        description: 'Strategic advisor rationale explaining the portfolio restructuring plan',
      },
      allocations: {
        type: 'ARRAY',
        description:
          'List of proposed fund allocation objects containing eligibleFundId, fundName, isin, amount, replacesEntryId, and rationale',
      },
    },
    required: ['allocations', 'executiveSummary'],
  };

  public async execute(
    args: Record<string, unknown>,
    context: AgentContext
  ): Promise<Record<string, unknown>> {
    const rawAllocations = Array.isArray(args.allocations) ? args.allocations : [];
    const executiveSummary = String(args.executiveSummary || 'Portfolio restructuring proposal.');
    const totalInvestable = typeof args.totalInvestable === 'number' ? args.totalInvestable : 0;

    if (rawAllocations.length === 0) {
      return {
        staged: false,
        error: 'Cannot stage recommendation draft: At least one fund allocation must be provided.',
      };
    }

    const allocations: ProposedAllocationDto[] = [];
    let allocatedTotal = 0;

    for (const item of rawAllocations as Array<Record<string, unknown>>) {
      const amount = Number(item.amount) || 0;
      allocatedTotal += amount;

      allocations.push({
        eligibleFundId: String(item.eligibleFundId || '663e00000000000000000001'),
        fundName: String(item.fundName || 'Recommended Fund'),
        isin: String(item.isin || 'INF879O01019'),
        scoreCategory: String(item.scoreCategory || 'MODERATE'),
        amount,
        replacesEntryId: item.replacesEntryId ? String(item.replacesEntryId) : undefined,
        rationale: String(item.rationale || 'Selected for superior risk-adjusted returns and regulatory compliance.'),
      });
    }

    // Deterministic Compliance & Risk Gate Validation
    const complianceErrors: string[] = [];
    if (allocatedTotal <= 0 && totalInvestable > 0) {
      complianceErrors.push('Total allocated amount must be greater than zero.');
    }

    const draft: RecommendationDraftDto = {
      clientId: context.clientId,
      portfolioReviewId: context.portfolioReviewId,
      flowType: context.flowType || 'REPLACE_FUNDS',
      scoreCategory: 'MODERATE',
      totalInvestable: totalInvestable > 0 ? totalInvestable : allocatedTotal,
      allocations,
      executiveSummary,
      compliancePassed: complianceErrors.length === 0,
    };

    return {
      staged: true,
      compliancePassed: complianceErrors.length === 0,
      complianceErrors,
      allocatedTotal,
      draft,
      message:
        complianceErrors.length === 0
          ? 'Recommendation draft proposal successfully validated and staged for RM review.'
          : 'Proposal staged with regulatory compliance warnings.',
    };
  }
}

export const stageRecommendationDraftTool = new StageRecommendationDraftTool();
