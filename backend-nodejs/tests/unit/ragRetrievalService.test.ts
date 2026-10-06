import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { RagRetrievalService } from '../../src/modules/portfolioreview/services/ragRetrievalService';
import { EligibleFund } from '../../src/modules/portfolioreview/models/EligibleFund';
import { FundDocumentEmbedding } from '../../src/modules/portfolioreview/models/FundDocumentEmbedding';
import { RiskAssessment } from '../../src/modules/riskappetite/models/RiskAssessment';
import { AssessmentStatus, ScoreCategoryCode } from '../../src/modules/riskappetite/enums/riskEnums';
import { geminiEmbeddingService } from '../../src/common/services/geminiEmbeddingService';
import { RagRetrievalRequestDto } from '../../src/modules/portfolioreview/dto/ragDto';

describe('RagRetrievalService (Candidate-Constrained Hybrid Retrieval)', () => {
  let service: RagRetrievalService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new RagRetrievalService();
  });

  it('should return isSufficient false when candidate ISIN filter yields zero eligible funds', async () => {
    // Mock EligibleFund.find() returning empty
    vi.spyOn(EligibleFund, 'find').mockReturnValue({
      select: vi.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof EligibleFund.find>);

    const request: RagRetrievalRequestDto = {
      query: 'What is the expense ratio?',
    };

    const result = await service.retrieveEvidence(request);

    expect(result.isSufficient).toBe(false);
    expect(result.ragSimilarityScore).toBe(0.0);
    expect(result.evidenceChunks).toEqual([]);
    expect(result.message).toContain('No eligible candidate mutual funds found');
  });

  it('should return isSufficient false when candidate funds exist but have no document embeddings', async () => {
    vi.spyOn(geminiEmbeddingService, 'getEmbedding').mockResolvedValue(new Array(768).fill(0.1));
    vi.spyOn(FundDocumentEmbedding, 'find').mockResolvedValue([]);

    const request: RagRetrievalRequestDto = {
      query: 'What is the expense ratio for HDFC Large Cap?',
      candidateIsins: ['INF179K01BE2'],
    };

    const result = await service.retrieveEvidence(request);

    expect(result.isSufficient).toBe(false);
    expect(result.candidateIsins).toEqual(['INF179K01BE2']);
    expect(result.evidenceChunks).toHaveLength(0);
    expect(result.message).toContain('No indexed regulatory documents found');
  });

  it('should rank evidence chunks by hybrid score and pass the Evidence Quality Gate when similarity >= threshold', async () => {
    const queryVector = [1, 0, 0, 0];
    vi.spyOn(geminiEmbeddingService, 'getEmbedding').mockResolvedValue(queryVector);

    const mockDocs = [
      {
        _id: new Types.ObjectId(),
        isin: 'INF179K01BE2',
        fundName: 'HDFC Top 100 Fund',
        documentType: 'FACTSHEET',
        scoreCategory: ScoreCategoryCode.MODERATE,
        assetClass: 'EQUITY',
        chunkIndex: 0,
        chunkText: 'The Total Expense Ratio for HDFC Top 100 Direct Plan is 1.15% per annum.',
        metadata: '{}',
        embedding: [0.95, 0.05, 0, 0], // High semantic similarity ~0.99
        createdAt: new Date(),
      },
      {
        _id: new Types.ObjectId(),
        isin: 'INF179K01BE2',
        fundName: 'HDFC Top 100 Fund',
        documentType: 'FACTSHEET',
        scoreCategory: ScoreCategoryCode.MODERATE,
        assetClass: 'EQUITY',
        chunkIndex: 1,
        chunkText: 'General overview of management philosophy and market conditions.',
        metadata: '{}',
        embedding: [0.3, 0.7, 0, 0], // Lower similarity
        createdAt: new Date(),
      },
    ];

    vi.spyOn(FundDocumentEmbedding, 'find').mockResolvedValue(
      mockDocs as unknown as ReturnType<typeof FundDocumentEmbedding.find>
    );

    const request: RagRetrievalRequestDto = {
      query: 'What is the expense ratio for HDFC Top 100?',
      candidateIsins: ['INF179K01BE2'],
      similarityThreshold: 0.7,
      topK: 5,
    };

    const result = await service.retrieveEvidence(request);

    expect(result.isSufficient).toBe(true);
    expect(result.ragSimilarityScore).toBeGreaterThanOrEqual(0.7);
    expect(result.evidenceChunks).toHaveLength(2);
    // Best matching chunk is ranked first
    expect(result.evidenceChunks[0].chunkIndex).toBe(0);
    expect(result.message).toContain('Evidence Quality Gate PASSED');
  });

  it('should fail the Evidence Quality Gate when top similarity is below the required threshold', async () => {
    const queryVector = [1, 0, 0, 0];
    vi.spyOn(geminiEmbeddingService, 'getEmbedding').mockResolvedValue(queryVector);

    const mockDocs = [
      {
        _id: new Types.ObjectId(),
        isin: 'INF179K01BE2',
        fundName: 'HDFC Top 100 Fund',
        documentType: 'FACTSHEET',
        scoreCategory: ScoreCategoryCode.MODERATE,
        assetClass: 'EQUITY',
        chunkIndex: 0,
        chunkText: 'Unrelated paragraph about office addresses and registrar.',
        metadata: '{}',
        embedding: [0.2, 0.8, 0, 0], // Cosine similarity ~ 0.24, well below 0.70
        createdAt: new Date(),
      },
    ];

    vi.spyOn(FundDocumentEmbedding, 'find').mockResolvedValue(
      mockDocs as unknown as ReturnType<typeof FundDocumentEmbedding.find>
    );

    const request: RagRetrievalRequestDto = {
      query: 'What is the TER of direct plan?',
      candidateIsins: ['INF179K01BE2'],
      similarityThreshold: 0.7,
    };

    const result = await service.retrieveEvidence(request);

    expect(result.isSufficient).toBe(false);
    expect(result.ragSimilarityScore).toBeLessThan(0.7);
    expect(result.message).toContain('Evidence Quality Gate FAILED');
  });

  it('should resolve candidate ISINs deterministically from client completed risk assessment', async () => {
    const clientId = new Types.ObjectId().toString();

    // Mock RiskAssessment lookup
    const mockQuery = {
      sort: vi.fn().mockResolvedValue({
        client: new Types.ObjectId(clientId),
        status: AssessmentStatus.COMPLETED,
        scoreCategory: ScoreCategoryCode.MODERATELY_HIGH,
      }),
    };
    vi.spyOn(RiskAssessment, 'findOne').mockReturnValue(
      mockQuery as unknown as ReturnType<typeof RiskAssessment.findOne>
    );

    // Mock EligibleFund lookup for that category
    vi.spyOn(EligibleFund, 'find').mockReturnValue({
      select: vi.fn().mockResolvedValue([{ isin: 'INF879O01019' }, { isin: 'INF179K01BE2' }]),
    } as unknown as ReturnType<typeof EligibleFund.find>);

    vi.spyOn(geminiEmbeddingService, 'getEmbedding').mockResolvedValue([1, 0, 0, 0]);
    vi.spyOn(FundDocumentEmbedding, 'find').mockResolvedValue([]);

    const request: RagRetrievalRequestDto = {
      query: 'Tell me about the fund returns',
      clientId,
    };

    const result = await service.retrieveEvidence(request);

    expect(result.candidateIsins).toEqual(['INF879O01019', 'INF179K01BE2']);
  });

  it('should respect topK parameter limiting the number of returned evidence chunks', async () => {
    const queryVector = [1, 0, 0, 0];
    vi.spyOn(geminiEmbeddingService, 'getEmbedding').mockResolvedValue(queryVector);

    const createMockDoc = (idx: number) => ({
      _id: new Types.ObjectId(),
      isin: 'INF179K01BE2',
      fundName: 'HDFC Top 100 Fund',
      documentType: 'FACTSHEET',
      scoreCategory: ScoreCategoryCode.MODERATE,
      assetClass: 'EQUITY',
      chunkIndex: idx,
      chunkText: `Chunk content index ${idx}`,
      metadata: '{}',
      embedding: [0.9, 0.1, 0, 0],
      createdAt: new Date(),
    });

    const mockDocs = [createMockDoc(0), createMockDoc(1), createMockDoc(2), createMockDoc(3)];

    vi.spyOn(FundDocumentEmbedding, 'find').mockResolvedValue(
      mockDocs as unknown as ReturnType<typeof FundDocumentEmbedding.find>
    );

    const request: RagRetrievalRequestDto = {
      query: 'Chunk query',
      candidateIsins: ['INF179K01BE2'],
      topK: 2,
    };

    const result = await service.retrieveEvidence(request);

    expect(result.evidenceChunks).toHaveLength(2);
  });
});
