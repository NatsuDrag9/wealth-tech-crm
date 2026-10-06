import { config } from '../../../config/environment';
import { logger } from '../../../common/utils/logger';
import { ragRetrievalDurationSeconds, ragSimilarityScore } from '../../../common/metrics/metrics';
import { geminiEmbeddingService } from '../../../common/services/geminiEmbeddingService';
import { EligibleFund } from '../models/EligibleFund';
import { FundDocumentEmbedding, IFundDocumentEmbedding } from '../models/FundDocumentEmbedding';
import { RiskAssessment } from '../../riskappetite/models/RiskAssessment';
import { AssessmentStatus } from '../../riskappetite/enums/riskEnums';
import {
  RagRetrievalRequestDto,
  RagRetrievalResponseDto,
  RetrievedEvidenceChunkDto,
} from '../dto/ragDto';

/**
 * Service for candidate-constrained hybrid RAG retrieval and post-retrieval quality validation.
 */
export class RagRetrievalService {
  private readonly defaultSimilarityThreshold: number;
  private readonly defaultTopK: number;

  constructor() {
    this.defaultSimilarityThreshold = config.rag.similarityThreshold;
    this.defaultTopK = config.rag.topK;
  }

  /**
   * Executes candidate-constrained retrieval with post-retrieval quality gate validation.
   */
  public async retrieveEvidence(request: RagRetrievalRequestDto): Promise<RagRetrievalResponseDto> {
    const startTime = Date.now();
    const endTimer = ragRetrievalDurationSeconds.startTimer({
      index_name: 'fund_document_embeddings',
      filter_category: request.scoreCategory || 'ALL',
    });

    try {
      // 1. Resolve Candidate ISINs (Deterministic Regulatory Filtering)
      const candidateIsins = await this.resolveCandidateIsins(request);
      if (candidateIsins.length === 0) {
        logger.warn({ query: request.query }, 'Candidate ISIN filter produced zero eligible funds');
        endTimer();
        return {
          query: request.query,
          isSufficient: false,
          ragSimilarityScore: 0.0,
          evidenceConsistencyScore: 0.0,
          candidateIsins: [],
          evidenceChunks: [],
          retrievalLatencyMs: Date.now() - startTime,
          message: 'No eligible candidate mutual funds found matching client risk profile or criteria.',
        };
      }

      // 2. Generate Dense Embedding Vector for Query
      const queryVector = await geminiEmbeddingService.getEmbedding(request.query);

      // 3. Candidate-Constrained Hybrid Retrieval
      const topK = request.topK && request.topK > 0 ? Math.min(request.topK, 20) : this.defaultTopK;
      const threshold = request.similarityThreshold ?? this.defaultSimilarityThreshold;

      const candidateChunks = await FundDocumentEmbedding.find({
        isin: { $in: candidateIsins },
      });

      if (candidateChunks.length === 0) {
        endTimer();
        return {
          query: request.query,
          isSufficient: false,
          ragSimilarityScore: 0.0,
          evidenceConsistencyScore: 0.0,
          candidateIsins,
          evidenceChunks: [],
          retrievalLatencyMs: Date.now() - startTime,
          message: 'No indexed regulatory documents found for the candidate funds.',
        };
      }

      // 4. Compute Hybrid Scores (70% Semantic Vector + 30% Lexical Keyword Matching)
      const scoredChunks: Array<{
        doc: IFundDocumentEmbedding;
        semanticScore: number;
        lexicalScore: number;
        hybridScore: number;
      }> = [];

      const queryTokens = request.query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);

      for (const chunk of candidateChunks) {
        const semanticScore = this.cosineSimilarity(queryVector, chunk.embedding);
        const lexicalScore = this.computeLexicalScore(chunk.chunkText, chunk.fundName, queryTokens);
        const hybridScore = 0.7 * semanticScore + 0.3 * lexicalScore;

        scoredChunks.push({
          doc: chunk,
          semanticScore,
          lexicalScore,
          hybridScore,
        });
      }

      // Sort descending by hybrid score
      scoredChunks.sort((a, b) => b.hybridScore - a.hybridScore);
      const topScored = scoredChunks.slice(0, topK);

      const maxSemanticScore = topScored.length > 0 ? Math.max(...topScored.map((s) => s.semanticScore)) : 0.0;
      ragSimilarityScore.observe({ index_name: 'fund_document_embeddings' }, maxSemanticScore);

      const evidenceChunks: RetrievedEvidenceChunkDto[] = topScored.map((s) => ({
        id: s.doc._id.toString(),
        isin: s.doc.isin,
        fundName: s.doc.fundName,
        documentType: s.doc.documentType,
        scoreCategory: s.doc.scoreCategory,
        assetClass: s.doc.assetClass,
        chunkIndex: s.doc.chunkIndex,
        chunkText: s.doc.chunkText,
        metadata: s.doc.metadata,
        similarityScore: parseFloat(s.semanticScore.toFixed(4)),
        createdAt: s.doc.createdAt ? new Date(s.doc.createdAt).toISOString() : undefined,
      }));

      // 5. Post-Retrieval Validation (Evidence Quality Gate)
      const isSufficient = maxSemanticScore >= threshold && evidenceChunks.length > 0;
      const consistencyScore = this.computeConsistencyScore(evidenceChunks);

      endTimer();
      const latencyMs = Date.now() - startTime;

      let message: string;
      if (isSufficient) {
        message = `Evidence Quality Gate PASSED: Retrieved ${evidenceChunks.length} verified chunks (top score: ${maxSemanticScore.toFixed(2)} >= threshold: ${threshold.toFixed(2)}).`;
      } else {
        message = `Evidence Quality Gate FAILED: Top relevance score (${maxSemanticScore.toFixed(2)}) is below the required threshold (${threshold.toFixed(2)}).`;
      }

      return {
        query: request.query,
        isSufficient,
        ragSimilarityScore: parseFloat(maxSemanticScore.toFixed(4)),
        evidenceConsistencyScore: parseFloat(consistencyScore.toFixed(4)),
        candidateIsins,
        evidenceChunks,
        retrievalLatencyMs: latencyMs,
        message,
      };
    } catch (error: unknown) {
      endTimer();
      logger.error({ err: error, query: request.query }, 'RAG retrieval failed unexpectedly');
      throw error;
    }
  }

  private async resolveCandidateIsins(request: RagRetrievalRequestDto): Promise<string[]> {
    if (request.candidateIsins && request.candidateIsins.length > 0) {
      return request.candidateIsins;
    }

    if (request.clientId) {
      const assessment = await RiskAssessment.findOne({
        client: request.clientId,
        status: AssessmentStatus.COMPLETED,
      }).sort({ createdAt: -1 });

      if (assessment && assessment.scoreCategory) {
        const funds = await EligibleFund.find({
          scoreCategory: assessment.scoreCategory,
          isActive: true,
        }).select('isin');
        const isins = funds.map((f) => f.isin).filter((isin): isin is string => Boolean(isin));
        if (isins.length > 0) return isins;
      }
    }

    if (request.scoreCategory) {
      const funds = await EligibleFund.find({
        scoreCategory: request.scoreCategory,
        isActive: true,
      }).select('isin');
      const isins = funds.map((f) => f.isin).filter((isin): isin is string => Boolean(isin));
      if (isins.length > 0) return isins;
    }

    // Default fallback: all active funds
    const allFunds = await EligibleFund.find({ isActive: true }).select('isin');
    return allFunds.map((f) => f.isin).filter((isin): isin is string => Boolean(isin));
  }

  private cosineSimilarity(v1: number[], v2: number[]): number {
    if (!v1 || !v2 || v1.length === 0 || v2.length === 0) return 0.0;
    const len = Math.min(v1.length, v2.length);
    let dot = 0.0;
    let norm1 = 0.0;
    let norm2 = 0.0;

    for (let i = 0; i < len; i++) {
      dot += v1[i] * v2[i];
      norm1 += v1[i] * v1[i];
      norm2 += v2[i] * v2[i];
    }

    const denom = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denom > 0.0 ? Math.max(0.0, Math.min(1.0, dot / denom)) : 0.0;
  }

  private computeLexicalScore(chunkText: string, fundName: string, queryTokens: string[]): number {
    if (queryTokens.length === 0) return 0.0;
    const textLower = `${chunkText} ${fundName}`.toLowerCase();
    let matches = 0;

    for (const token of queryTokens) {
      if (textLower.includes(token)) {
        matches++;
      }
    }

    return Math.min(1.0, matches / queryTokens.length);
  }

  private computeConsistencyScore(chunks: RetrievedEvidenceChunkDto[]): number {
    if (chunks.length <= 1) return 1.0;
    const isins = new Set(chunks.map((c) => c.isin));
    return parseFloat((1.0 / isins.size).toFixed(4));
  }
}

export const ragRetrievalService = new RagRetrievalService();
