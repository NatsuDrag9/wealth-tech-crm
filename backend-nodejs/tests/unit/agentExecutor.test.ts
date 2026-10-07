import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { agentExecutor } from '../../src/modules/agent/services/agentExecutor';
import { AgentRunRequestDto } from '../../src/modules/agent/dto/agentDto';
import { AgentMode, AgentStatus } from '../../src/modules/agent/enums/agentEnums';
import { Client } from '../../src/modules/customer/models/Client';
import { ClientProfile } from '../../src/modules/customer/models/ClientProfile';
import { RiskAssessment } from '../../src/modules/riskappetite/models/RiskAssessment';
import { PortfolioReview } from '../../src/modules/portfolioreview/models/PortfolioReview';
import { EligibleFund } from '../../src/modules/portfolioreview/models/EligibleFund';
import { ragRetrievalService } from '../../src/modules/portfolioreview/services/ragRetrievalService';
import { AssessmentStatus, ScoreCategoryCode } from '../../src/modules/riskappetite/enums/riskEnums';
import { EntryAction } from '../../src/modules/portfolioreview/enums/portfolioEnums';
import { geminiGenerationService } from '../../src/common/services/geminiGenerationService';

describe('AgentExecutor Unit Tests', () => {
  const clientId = new Types.ObjectId().toString();
  const portfolioReviewId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.restoreAllMocks();

    // Mock Client & Profile
    vi.spyOn(Client, 'findById').mockResolvedValue({
      _id: new Types.ObjectId(clientId),
      firstName: 'Aarav',
      lastName: 'Sharma',
      email: 'aarav.sharma@example.com',
      phone: '+919876543210',
      pan: 'ABCDE1234F',
      status: 'ACTIVE',
    } as unknown as ReturnType<typeof Client.findById>);

    vi.spyOn(ClientProfile, 'findOne').mockResolvedValue({
      client: new Types.ObjectId(clientId),
      kycStatus: 'VERIFIED',
      addressLine: '101 Marine Drive',
      city: 'Mumbai',
      pincode: '400020',
    } as unknown as ReturnType<typeof ClientProfile.findOne>);

    // Mock Risk Assessment
    const mockRiskQuery = {
      sort: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        client: new Types.ObjectId(clientId),
        scoreCategory: ScoreCategoryCode.AGGRESSIVE,
        totalScore: 60,
        status: AssessmentStatus.COMPLETED,
        updatedAt: new Date(),
      }),
    };
    vi.spyOn(RiskAssessment, 'findOne').mockReturnValue(
      mockRiskQuery as unknown as ReturnType<typeof RiskAssessment.findOne>
    );

    // Mock Portfolio Review with SELL and HOLD entries
    vi.spyOn(PortfolioReview, 'findById').mockResolvedValue({
      _id: new Types.ObjectId(portfolioReviewId),
      totalInvested: 200000,
      totalCurrentValue: 240000,
      entries: [
        {
          _id: new Types.ObjectId(),
          fundName: 'Axis Long Term Equity Fund',
          isin: 'INF846K01164',
          investedAmount: 50000,
          currentValue: 60000,
          action: EntryAction.SELL,
        },
        {
          _id: new Types.ObjectId(),
          fundName: 'HDFC Top 100 Fund',
          isin: 'INF179K01BE2',
          investedAmount: 150000,
          currentValue: 180000,
          action: EntryAction.HOLD,
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
        {
          _id: new Types.ObjectId(),
          fundName: 'Mirae Asset Large Cap Fund',
          isin: 'INF769K01010',
          scoreCategory: ScoreCategoryCode.AGGRESSIVE,
          assetClass: 'EQUITY',
          fundSubCategory: 'LARGE_CAP',
        },
      ]),
    } as unknown as ReturnType<typeof EligibleFund.find>);

    // Mock RAG Retrieval Service
    vi.spyOn(ragRetrievalService, 'retrieveEvidence').mockResolvedValue({
      isSufficient: true,
      ragSimilarityScore: 0.88,
      evidenceChunks: [
        {
          isin: 'INF879O01019',
          fundName: 'Parag Parikh Flexi Cap Fund',
          documentType: 'FACTSHEET',
          chunkIndex: 0,
          chunkText: 'Fund factsheet highlighting low expense ratio and value investing framework.',
          similarityScore: 0.88,
        },
      ],
      message: 'Evidence Quality Gate PASSED',
    });
  });

  it('should execute the deterministic offline ReAct loop and return a staged recommendation proposal with step traces', async () => {
    vi.spyOn(geminiGenerationService, 'isLiveKeyConfigured').mockReturnValue(false);

    const request: AgentRunRequestDto = {
      clientId,
      portfolioReviewId,
      flowType: 'REPLACE_FUNDS',
      userGoal: 'Rebalance portfolio to exit underperforming holdings and allocate into suitable schemes',
      agentMode: AgentMode.VANILLA,
    };

    const response = await agentExecutor.runAgent(request);

    expect(response.status).toBe(AgentStatus.SUCCESS);
    expect(response.agentMode).toBe(AgentMode.VANILLA);
    expect(response.totalSteps).toBe(5);
    expect(response.traces.length).toBe(5);
    expect(response.toolCalls).toBe(5);

    // Verify step ledger trace structure
    for (const trace of response.traces) {
      expect(trace.stepNumber).toBeGreaterThan(0);
      expect(trace.toolName).toBeDefined();
      expect(trace.thought).toBeDefined();
      expect(trace.durationMs).toBeGreaterThanOrEqual(0);
      expect(trace.status).toBe('SUCCESS');
    }

    // Verify staged draft output
    expect(response.recommendationDraft).toBeDefined();
    expect(response.recommendationDraft?.allocations.length).toBe(2);
    expect(response.recommendationDraft?.totalInvestable).toBe(60000);
    expect(response.recommendationDraft?.compliancePassed).toBe(true);
    expect(response.recommendationDraft?.executiveSummary).toContain('aggressive');
  });

  it('should execute dynamic Gemini function calling loop when live key is configured', async () => {
    vi.spyOn(geminiGenerationService, 'isLiveKeyConfigured').mockReturnValue(true);

    // Mock fetch for Gemini API calls:
    // Call 1: tool call getClientDetails
    // Call 2: tool call stageDraftProposal
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
                          executiveSummary: 'Dynamic Gemini proposal',
                          allocations: [
                            {
                              eligibleFundId: '663e00000000000000000001',
                              fundName: 'Parag Parikh Flexi Cap Fund',
                              isin: 'INF879O01019',
                              scoreCategory: 'aggressive',
                              amount: 60000,
                              rationale: 'Core allocation',
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
      userGoal: 'Dynamic test goal',
    };

    const response = await agentExecutor.runAgent(request);

    expect(response.status).toBe(AgentStatus.SUCCESS);
    expect(response.traces.length).toBe(2);
    expect(response.recommendationDraft).toBeDefined();
    expect(response.recommendationDraft?.totalInvestable).toBe(60000);

    vi.unstubAllGlobals();
  });
});
