import { EligibleFund } from '../../portfolioreview/models/EligibleFund';
import { ragRetrievalService } from '../../portfolioreview/services/ragRetrievalService';
import { AgentContext, AgentTool } from './types';
import { logger } from '../../../common/utils/logger';

export class FundResearchRagTool implements AgentTool {
  public readonly name = 'searchEligibleFunds';
  public readonly description =
    'Performs candidate-grounded hybrid RAG retrieval over official mutual fund regulatory disclosures (factsheets, SIDs, TER, riskometers) and returns eligible replacement schemes.';

  public readonly parameters = {
    type: 'OBJECT' as const,
    properties: {
      query: {
        type: 'STRING',
        description: 'Semantic search query (e.g. "large cap equity fund with lowest expense ratio")',
      },
      scoreCategory: {
        type: 'STRING',
        description: 'Optional risk appetite category filter (e.g. CONSERVATIVE, MODERATE, AGGRESSIVE)',
      },
      topK: {
        type: 'INTEGER',
        description: 'Maximum number of candidate evidence chunks to retrieve (default 5)',
      },
    },
    required: ['query'],
  };

  public async execute(
    args: Record<string, unknown>,
    context: AgentContext
  ): Promise<Record<string, unknown>> {
    const query = String(args.query || 'mutual fund factsheet and scheme information');
    const scoreCategory = args.scoreCategory ? String(args.scoreCategory) : undefined;
    const topK = typeof args.topK === 'number' ? args.topK : 5;

    try {
      // 1. Fetch eligible funds matching risk category
      const fundFilter: Record<string, unknown> = { isActive: true };
      if (scoreCategory) {
        fundFilter.scoreCategory = scoreCategory;
      }

      const eligibleFunds = await EligibleFund.find(fundFilter).limit(10);

      // 2. Perform Candidate-Grounded Vector + Keyword Hybrid Retrieval
      const ragResponse = await ragRetrievalService.retrieveEvidence({
        query,
        clientId: context.clientId,
        scoreCategory,
        topK,
      });

      const candidates = eligibleFunds.map((f) => ({
        eligibleFundId: f._id.toString(),
        fundName: f.fundName,
        isin: f.isin,
        scoreCategory: f.scoreCategory,
        assetClass: f.assetClass,
        fundSubCategory: f.fundSubCategory,
      }));

      const evidence = ragResponse.evidenceChunks.map((chunk, idx) => ({
        sourceTag: `[Source ${idx + 1}]`,
        fundName: chunk.fundName,
        isin: chunk.isin,
        documentType: chunk.documentType,
        similarityScore: chunk.similarityScore,
        snippet: chunk.chunkText.slice(0, 300) + '...',
      }));

      return {
        isQualityGateSatisfied: ragResponse.isSufficient,
        ragSimilarityScore: ragResponse.ragSimilarityScore,
        candidateCount: candidates.length,
        candidateFunds: candidates,
        groundedEvidence: evidence,
        message: ragResponse.message,
      };
    } catch (error: unknown) {
      logger.error({ err: error, query }, 'Error executing searchEligibleFunds tool');
      return {
        isQualityGateSatisfied: false,
        candidateFunds: [],
        groundedEvidence: [],
        error: 'RAG retrieval failed unexpectedly.',
      };
    }
  }
}

export const fundResearchRagTool = new FundResearchRagTool();
