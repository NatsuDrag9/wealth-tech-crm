import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { portfolioMcpServer } from '../../src/modules/agent/mcp/portfolioMcpServer';
import { portfolioMcpClient } from '../../src/modules/agent/mcp/portfolioMcpClient';
import { mcpAgentStrategy } from '../../src/modules/agent/strategy/impl/mcpAgentStrategy';
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

describe('Model Context Protocol (MCP) Agent Unit Tests (Step 3)', () => {
  const clientId = new Types.ObjectId().toString();
  const portfolioReviewId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.restoreAllMocks();

    // Mock Client & Profile
    vi.spyOn(Client, 'findById').mockResolvedValue({
      _id: new Types.ObjectId(clientId),
      firstName: 'Vikram',
      lastName: 'Mehta',
      email: 'vikram.mehta@example.com',
      phone: '+919988776655',
      pan: 'ABCDE5555M',
      status: 'ACTIVE',
    } as unknown as ReturnType<typeof Client.findById>);

    vi.spyOn(ClientProfile, 'findOne').mockResolvedValue({
      client: new Types.ObjectId(clientId),
      kycStatus: 'VERIFIED',
      addressLine: '502 Bandra Kurla Complex',
      city: 'Mumbai',
      pincode: '400051',
    } as unknown as ReturnType<typeof ClientProfile.findOne>);

    // Mock Risk Assessment
    const mockRiskQuery = {
      sort: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        client: new Types.ObjectId(clientId),
        scoreCategory: ScoreCategoryCode.AGGRESSIVE,
        totalScore: 64,
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
      totalInvested: 150000,
      totalCurrentValue: 180000,
      entries: [
        {
          _id: new Types.ObjectId(),
          fundName: 'UTI Nifty 50 Index Fund',
          isin: 'INF789K01001',
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
      ragSimilarityScore: 0.94,
      evidenceChunks: [
        {
          isin: 'INF879O01019',
          fundName: 'Parag Parikh Flexi Cap Fund',
          documentType: 'FACTSHEET',
          chunkIndex: 0,
          chunkText: 'Scheme factsheet details and performance indicators.',
          similarityScore: 0.94,
        },
      ],
      message: 'Evidence Quality Gate PASSED',
    });
  });

  describe('PortfolioMcpServer & PortfolioMcpClient', () => {
    it('should initialize MCP Server and expose all 5 registered domain tools', async () => {
      await portfolioMcpClient.connect();
      const tools = await portfolioMcpClient.listTools();

      expect(tools.length).toBe(5);
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('getClientDetails');
      expect(toolNames).toContain('getRiskProfile');
      expect(toolNames).toContain('getPortfolioHoldings');
      expect(toolNames).toContain('searchEligibleFunds');
      expect(toolNames).toContain('stageDraftProposal');
    });

    it('should execute getClientDetails tool across the MCP protocol boundary', async () => {
      const result = await portfolioMcpClient.callTool('getClientDetails', { clientId });

      expect(result.found).toBe(true);
      expect(result.clientId).toBe(clientId);
      expect(result.fullName).toBe('Vikram Mehta');
      expect(result.kycStatus).toBe('VERIFIED');
    });

    it('should execute getRiskProfile tool across the MCP protocol boundary', async () => {
      const result = await portfolioMcpClient.callTool('getRiskProfile', { clientId });

      expect(result.assessed).toBe(true);
      expect(result.scoreCategory).toBe(ScoreCategoryCode.AGGRESSIVE);
      expect(result.totalScore).toBe(64);
    });

    it('should execute getPortfolioHoldings tool across the MCP protocol boundary', async () => {
      const result = await portfolioMcpClient.callTool('getPortfolioHoldings', { portfolioReviewId });

      expect(result.found).toBe(true);
      expect(result.totalSellProceeds).toBe(60000);
      expect(Array.isArray(result.sellHoldings)).toBe(true);
    });

    it('should execute stageDraftProposal tool across the MCP protocol boundary', async () => {
      const allocations = [
        {
          eligibleFundId: '663e00000000000000000001',
          fundName: 'Parag Parikh Flexi Cap Fund',
          isin: 'INF879O01019',
          scoreCategory: 'aggressive',
          amount: 60000,
          rationale: 'Core equity allocation',
        },
      ];

      const result = await portfolioMcpClient.callTool('stageDraftProposal', {
        totalInvestable: 60000,
        executiveSummary: 'MCP proposal staging test',
        clientId,
        allocations,
      });

      expect(result.staged).toBe(true);
      expect(result.allocatedTotal).toBe(60000);
      expect(result.compliancePassed).toBe(true);
    });
  });

  describe('AgentStrategyResolver for MCP', () => {
    it('should resolve MCP mode to McpAgentStrategy', () => {
      const strategy = agentStrategyResolver.resolve(AgentMode.MCP);
      expect(strategy.mode).toBe(AgentMode.MCP);
    });

    it('should list MCP among all registered strategy modes', () => {
      const modes = agentStrategyResolver.getRegisteredModes();
      expect(modes).toContain(AgentMode.MCP);
      expect(modes).toContain(AgentMode.FRAMEWORK);
      expect(modes).toContain(AgentMode.VANILLA);
    });
  });

  describe('McpAgentStrategy Execution Workflow', () => {
    it('should execute advisory loop through MCP protocol boundary in deterministic mode', async () => {
      vi.spyOn(geminiGenerationService, 'isLiveKeyConfigured').mockReturnValue(false);

      const request: AgentRunRequestDto = {
        clientId,
        portfolioReviewId,
        flowType: 'REPLACE_FUNDS',
        userGoal: 'Rebalance portfolio via MCP client-server architecture',
        agentMode: AgentMode.MCP,
      };

      const response = await mcpAgentStrategy.execute(request);

      expect(response.status).toBe(AgentStatus.SUCCESS);
      expect(response.agentMode).toBe(AgentMode.MCP);
      expect(response.totalSteps).toBe(5);
      expect(response.traces.length).toBe(5);
      expect(response.toolCalls).toBe(5);

      // Verify traces
      for (const trace of response.traces) {
        expect(trace.stepNumber).toBeGreaterThan(0);
        expect(trace.toolName).toBeDefined();
        expect(trace.status).toBe('SUCCESS');
      }

      // Verify staged draft proposal
      expect(response.recommendationDraft).toBeDefined();
      expect(response.recommendationDraft?.compliancePassed).toBe(true);
      expect(response.recommendationDraft?.totalInvestable).toBe(60000);
      expect(response.message).toContain('MCP Agent successfully formulated');
    });

    it('should execute live Gemini function calling through MCP protocol boundary when configured', async () => {
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
                            executiveSummary: 'Dynamic MCP Staged Proposal',
                            allocations: [
                              {
                                eligibleFundId: '663e00000000000000000001',
                                fundName: 'Parag Parikh Flexi Cap Fund',
                                isin: 'INF879O01019',
                                scoreCategory: 'aggressive',
                                amount: 60000,
                                rationale: 'MCP Core allocation',
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
        userGoal: 'MCP Dynamic Gemini Test',
        agentMode: AgentMode.MCP,
      };

      const response = await mcpAgentStrategy.execute(request);

      expect(response.status).toBe(AgentStatus.SUCCESS);
      expect(response.recommendationDraft).toBeDefined();
      expect(response.recommendationDraft?.totalInvestable).toBe(60000);

      vi.unstubAllGlobals();
    });
  });
});
