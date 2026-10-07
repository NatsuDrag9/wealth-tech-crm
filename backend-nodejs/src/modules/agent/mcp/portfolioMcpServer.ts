import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { toolRegistry } from '../tools/toolRegistry';
import { AgentContext } from '../tools/types';
import { logger } from '../../../common/utils/logger';

export class PortfolioMcpServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'wealthtech-portfolio-mcp-server',
      version: '1.0.0',
    });

    this.registerMcpTools();
  }

  public getServer(): McpServer {
    return this.server;
  }

  private registerMcpTools(): void {
    // 1. Client Details Tool
    this.server.tool(
      'getClientDetails',
      'Fetches client profile, KYC verification status, and assigned Relationship Manager details by client ID.',
      {
        clientId: z.string().describe('The unique MongoDB ObjectID or ID string of the client'),
      },
      async (args) => {
        logger.info({ tool: 'getClientDetails', args }, 'MCP Server received getClientDetails tool call');
        const context: AgentContext = { clientId: args.clientId, flowType: 'REPLACE_FUNDS' };
        const result = await toolRegistry.executeTool('getClientDetails', args, context);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }
    );

    // 2. Risk Profile Tool
    this.server.tool(
      'getRiskProfile',
      'Fetches the client assessed risk appetite profile, score category (e.g. CONSERVATIVE, MODERATE, AGGRESSIVE), and compliance assessment status.',
      {
        clientId: z.string().describe('The unique client ID to retrieve risk assessment for'),
      },
      async (args) => {
        logger.info({ tool: 'getRiskProfile', args }, 'MCP Server received getRiskProfile tool call');
        const context: AgentContext = { clientId: args.clientId, flowType: 'REPLACE_FUNDS' };
        const result = await toolRegistry.executeTool('getRiskProfile', args, context);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }
    );

    // 3. Portfolio Review Holdings Tool
    this.server.tool(
      'getPortfolioHoldings',
      'Fetches existing eCAS investment holdings for a portfolio review, categorizing holdings marked for SELL vs HOLD and calculating total investable exit proceeds.',
      {
        portfolioReviewId: z.string().optional().describe('Optional ID of the specific portfolio review record'),
        clientId: z.string().optional().describe('Optional client ID to find latest review'),
      },
      async (args) => {
        logger.info({ tool: 'getPortfolioHoldings', args }, 'MCP Server received getPortfolioHoldings tool call');
        const context: AgentContext = {
          clientId: args.clientId || '',
          portfolioReviewId: args.portfolioReviewId,
          flowType: 'REPLACE_FUNDS',
        };
        const result = await toolRegistry.executeTool('getPortfolioHoldings', args, context);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }
    );

    // 4. Fund Research RAG Tool
    this.server.tool(
      'searchEligibleFunds',
      'Performs candidate-grounded hybrid RAG retrieval over official mutual fund regulatory disclosures (factsheets, SIDs, TER, riskometers) and returns eligible replacement schemes.',
      {
        query: z.string().describe('Semantic search query'),
        scoreCategory: z.string().optional().describe('Optional risk appetite category filter'),
        topK: z.number().optional().describe('Maximum number of candidate evidence chunks to retrieve'),
        clientId: z.string().optional().describe('Optional client ID for risk-grounding'),
      },
      async (args) => {
        logger.info({ tool: 'searchEligibleFunds', query: args.query }, 'MCP Server received searchEligibleFunds tool call');
        const context: AgentContext = {
          clientId: args.clientId || '',
          flowType: 'REPLACE_FUNDS',
        };
        const result = await toolRegistry.executeTool('searchEligibleFunds', args, context);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }
    );

    // 5. Stage Recommendation Draft Proposal Tool
    this.server.tool(
      'stageDraftProposal',
      'Validates allocation percentages, total investable proceeds, and regulatory compliance constraints, staging the finalized advisory proposal draft for RM approval.',
      {
        totalInvestable: z.number().describe('Total investable capital available for reallocation'),
        executiveSummary: z.string().describe('Strategic executive rationale summarizing the proposed rebalancing'),
        clientId: z.string().optional().describe('Client ID'),
        portfolioReviewId: z.string().optional().describe('Portfolio Review ID'),
        allocations: z
          .array(
            z.object({
              eligibleFundId: z.string(),
              fundName: z.string(),
              isin: z.string(),
              scoreCategory: z.string(),
              amount: z.number(),
              replacesEntryId: z.string().optional(),
              rationale: z.string(),
            })
          )
          .describe('List of proposed fund allocation line items'),
      },
      async (args) => {
        logger.info({ tool: 'stageDraftProposal', allocationsCount: args.allocations.length }, 'MCP Server received stageDraftProposal tool call');
        const context: AgentContext = {
          clientId: args.clientId || '',
          portfolioReviewId: args.portfolioReviewId,
          flowType: 'REPLACE_FUNDS',
        };
        const result = await toolRegistry.executeTool('stageDraftProposal', args, context);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }
    );
  }
}

export const portfolioMcpServer = new PortfolioMcpServer();
