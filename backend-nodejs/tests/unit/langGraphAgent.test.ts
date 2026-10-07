import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { langGraphAgentStrategy } from '../../src/modules/agent/strategy/impl/langGraphAgentStrategy';
import { agentStrategyResolver } from '../../src/modules/agent/strategy/agentStrategyResolver';
import { AgentMode, AgentStatus } from '../../src/modules/agent/enums/agentEnums';
import { AgentRunRequestDto } from '../../src/modules/agent/dto/agentDto';
import { Client } from '../../src/modules/customer/models/Client';
import { ClientProfile } from '../../src/modules/customer/models/ClientProfile';
import { RiskAssessment } from '../../src/modules/riskappetite/models/RiskAssessment';
import { PortfolioReview } from '../../src/modules/portfolioreview/models/PortfolioReview';
import { EligibleFund } from '../../src/modules/portfolioreview/models/EligibleFund';
import { ragRetrievalService } from '../../src/modules/portfolioreview/services/ragRetrievalService';
import { AssessmentStatus, ScoreCategoryCode } from '../../src/modules/riskappetite/enums/riskEnums';
import { EntryAction } from '../../src/modules/portfolioreview/enums/portfolioEnums';
import { geminiGenerationService } from '../../src/common/services/geminiGenerationService';

describe('LangGraph Agent Framework Unit Tests (Step 2)', () => {
  const clientId = new Types.ObjectId().toString();
  const portfolioReviewId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.restoreAllMocks();

    // Mock Client & Profile
    vi.spyOn(Client, 'findById').mockResolvedValue({
      _id: new Types.ObjectId(clientId),
      firstName: 'Priya',
      lastName: 'Patel',
      email: 'priya.patel@example.com',
      phone: '+919812345678',
      pan: 'ABCDE9999Z',
      status: 'ACTIVE',
    } as unknown as ReturnType<typeof Client.findById>);

    vi.spyOn(ClientProfile, 'findOne').mockResolvedValue({
      client: new Types.ObjectId(clientId),
      kycStatus: 'VERIFIED',
      addressLine: '404 MG Road',
      city: 'Bengaluru',
      pincode: '560001',
    } as unknown as ReturnType<typeof ClientProfile.findOne>);

    // Mock Risk Assessment
    const mockRiskQuery = {
      sort: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        client: new Types.ObjectId(clientId),
        scoreCategory: ScoreCategoryCode.AGGRESSIVE,
        totalScore: 62,
        status: AssessmentStatus.COMPLETED,
        updatedAt: new Date(),
      }),
    };
    vi.spyOn(RiskAssessment, 'findOne').mockReturnValue(
      mockRiskQuery as unknown as ReturnType<typeof RiskAssessment.findOne>
    );

    // Mock Portfolio Review
    vi.spyOn(PortfolioReview, 'findById').mockResolvedValue({
      _id: new Types.ObjectId(portfolioReviewId),
      totalInvested: 100000,
      totalCurrentValue: 120000,
      entries: [
        {
          _id: new Types.ObjectId(),
          fundName: 'SBI Bluechip Fund',
          isin: 'INF200K01135',
          investedAmount: 50000,
          currentValue: 60000,
          action: EntryAction.SELL,
        },
      ],
    } as unknown as ReturnType<typeof PortfolioReview.findById>);

    // Mock Eligible Funds
    vi.spyOn(EligibleFund, 'find').mockReturnValue({
      limit: vi.fn().mockResolvedValue([
        {
          _id: new Types.ObjectId(),
          fundName: 'Parag Parikh Flexi Cap Fund',
          isin: 'INF879O01019',
          scoreCategory: ScoreCategoryCode.AGGRESSIVE,
          assetClass: 'EQUITY',
          fundSubCategory: 'FLEXI_CAP',
        },
      ]),
    } as unknown as ReturnType<typeof EligibleFund.find>);

    // Mock RAG Retrieval Service
    vi.spyOn(ragRetrievalService, 'retrieveEvidence').mockResolvedValue({
      isSufficient: true,
      ragSimilarityScore: 0.92,
      evidenceChunks: [
        {
          isin: 'INF879O01019',
          fundName: 'Parag Parikh Flexi Cap Fund',
          documentType: 'FACTSHEET',
          chunkIndex: 0,
          chunkText: 'Scheme factsheet details and performance indicators.',
          similarityScore: 0.92,
        },
      ],
      message: 'Evidence Quality Gate PASSED',
    });
  });

  describe('AgentStrategyResolver', () => {
    it('should resolve FRAMEWORK mode to LangGraphAgentStrategy', () => {
      const strategy = agentStrategyResolver.resolve(AgentMode.FRAMEWORK);
      expect(strategy.mode).toBe(AgentMode.FRAMEWORK);
    });

    it('should resolve VANILLA mode to VanillaAgentStrategy', () => {
      const strategy = agentStrategyResolver.resolve(AgentMode.VANILLA);
      expect(strategy.mode).toBe(AgentMode.VANILLA);
    });

    it('should fallback to FRAMEWORK mode when mode is undefined', () => {
      const strategy = agentStrategyResolver.resolve(undefined);
      expect(strategy.mode).toBe(AgentMode.FRAMEWORK);
    });

    it('should list all registered strategy modes', () => {
      const modes = agentStrategyResolver.getRegisteredModes();
      expect(modes).toContain(AgentMode.VANILLA);
      expect(modes).toContain(AgentMode.FRAMEWORK);
    });
  });

  describe('LangGraph StateGraph Execution Workflow', () => {
    it('should execute StateGraph workflow in deterministic framework mode and stage recommendation draft', async () => {
      vi.spyOn(geminiGenerationService, 'isLiveKeyConfigured').mockReturnValue(false);

      const request: AgentRunRequestDto = {
        clientId,
        portfolioReviewId,
        flowType: 'REPLACE_FUNDS',
        userGoal: 'Rebalance portfolio via LangGraph framework abstractions',
        agentMode: AgentMode.FRAMEWORK,
      };

      const response = await langGraphAgentStrategy.execute(request);

      expect(response.status).toBe(AgentStatus.SUCCESS);
      expect(response.agentMode).toBe(AgentMode.FRAMEWORK);
      expect(response.totalSteps).toBe(5);
      expect(response.traces.length).toBe(5);

      // Verify traces contain all executed tools
      const toolNames = response.traces.map((t) => t.toolName);
      expect(toolNames).toContain('getClientDetails');
      expect(toolNames).toContain('getRiskProfile');
      expect(toolNames).toContain('getPortfolioHoldings');
      expect(toolNames).toContain('searchEligibleFunds');
      expect(toolNames).toContain('stageDraftProposal');

      // Verify staged recommendation proposal
      expect(response.recommendationDraft).toBeDefined();
      expect(response.recommendationDraft?.compliancePassed).toBe(true);
      expect(response.recommendationDraft?.totalInvestable).toBe(60000);
      expect(response.recommendationDraft?.allocations.length).toBeGreaterThan(0);
      expect(response.message).toContain('LangGraph agent successfully converged');
    });

    it('should execute StateGraph workflow with live Gemini tool calling when configured', async () => {
      vi.spyOn(geminiGenerationService, 'isLiveKeyConfigured').mockReturnValue(true);

      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: true,
            json: async () => ({
              candidates: [
                {
                  content: {
                    role: 'model',
                    parts: [
                      {
                        functionCall: {
                          name: 'getClientDetails',
                          args: { clientId },
                        },
                      },
                    ],
                  },
                },
              ],
            }),
          };
        } else {
          return {
            ok: true,
            json: async () => ({
              candidates: [
                {
                  content: {
                    role: 'model',
                    parts: [
                      {
                        functionCall: {
                          name: 'stageDraftProposal',
                          args: {
                            totalInvestable: 60000,
                            executiveSummary: 'LangGraph Dynamic Gemini Staged Proposal',
                            allocations: [
                              {
                                eligibleFundId: '663e00000000000000000001',
                                fundName: 'Parag Parikh Flexi Cap Fund',
                                isin: 'INF879O01019',
                                scoreCategory: 'aggressive',
                                amount: 60000,
                                rationale: 'Framework allocation',
                              },
                            ],
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            }),
          };
        }
      });

      vi.stubGlobal('fetch', mockFetch);

      const request: AgentRunRequestDto = {
        clientId,
        portfolioReviewId,
        flowType: 'REPLACE_FUNDS',
        userGoal: 'LangGraph live key test',
        agentMode: AgentMode.FRAMEWORK,
      };

      const response = await langGraphAgentStrategy.execute(request);

      expect(response.status).toBe(AgentStatus.SUCCESS);
      expect(response.recommendationDraft).toBeDefined();
      expect(response.recommendationDraft?.totalInvestable).toBe(60000);

      vi.unstubAllGlobals();
    });
  });
});
