import { describe, it, expect } from 'vitest';
import { toolRegistry } from '../../src/modules/agent/tools/toolRegistry';
import { stageRecommendationDraftTool } from '../../src/modules/agent/tools/stageRecommendationDraftTool';
import { AgentContext } from '../../src/modules/agent/tools/types';

describe('Agent Tools & ToolRegistry Unit Tests', () => {
  const dummyContext: AgentContext = {
    clientId: '663e00000000000000000001',
    portfolioReviewId: '663e00000000000000000002',
    flowType: 'REPLACE_FUNDS',
    userGoal: 'Test advisory goal',
  };

  it('should register all 5 core domain tools in ToolRegistry', () => {
    const tools = toolRegistry.getAllTools();
    expect(tools.length).toBe(5);

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('getClientDetails');
    expect(toolNames).toContain('getRiskProfile');
    expect(toolNames).toContain('getPortfolioHoldings');
    expect(toolNames).toContain('searchEligibleFunds');
    expect(toolNames).toContain('stageDraftProposal');
  });

  it('should generate valid Google Gemini function declarations', () => {
    const declarations = toolRegistry.getGeminiFunctionDeclarations();
    expect(declarations.length).toBe(5);

    for (const decl of declarations) {
      expect(decl.name).toBeDefined();
      expect(decl.description).toBeDefined();
      expect(decl.parameters.type).toBe('OBJECT');
      expect(decl.parameters.properties).toBeDefined();
    }
  });

  it('should return error when invoking an unrecognized tool', async () => {
    const result = await toolRegistry.executeTool('nonExistentTool', {}, dummyContext);
    expect(result.error).toContain('not recognized');
  });

  it('should validate and stage draft proposal in stageRecommendationDraftTool', async () => {
    const allocations = [
      {
        eligibleFundId: '663e00000000000000000001',
        fundName: 'Parag Parikh Flexi Cap Fund',
        isin: 'INF879O01019',
        scoreCategory: 'AGGRESSIVE',
        amount: 50000,
        rationale: 'Core equity allocation',
      },
    ];

    const result = await stageRecommendationDraftTool.execute(
      {
        totalInvestable: 50000,
        executiveSummary: 'Rebalancing ₹50,000 into active flexi cap equity scheme.',
        allocations,
      },
      dummyContext
    );

    expect(result.staged).toBe(true);
    expect(result.compliancePassed).toBe(true);
    expect(result.allocatedTotal).toBe(50000);
    expect(result.draft).toBeDefined();
  });

  it('should reject staging draft when no allocations are provided', async () => {
    const result = await stageRecommendationDraftTool.execute(
      {
        totalInvestable: 50000,
        executiveSummary: 'Empty draft',
        allocations: [],
      },
      dummyContext
    );

    expect(result.staged).toBe(false);
    expect(result.error).toContain('At least one fund allocation must be provided');
  });
});
