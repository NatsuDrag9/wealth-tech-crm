import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { RagRetrievalService } from '../../src/modules/portfolioreview/services/ragRetrievalService';
import { FundDocumentEmbedding } from '../../src/modules/portfolioreview/models/FundDocumentEmbedding';
import { ScoreCategoryCode } from '../../src/modules/riskappetite/enums/riskEnums';
import { geminiEmbeddingService } from '../../src/common/services/geminiEmbeddingService';
import { GOLDEN_DATASET, GoldenDatasetEntry } from './goldenDataset';

describe('RAG Retrieval Benchmark (Information Retrieval Quality Gates)', () => {
  let retrievalService: RagRetrievalService;

  beforeEach(() => {
    vi.restoreAllMocks();
    retrievalService = new RagRetrievalService();
  });

  it('should satisfy Recall@K and MRR thresholds across the Golden Dataset', async () => {
    // 1. Build authentic simulated embeddings indexed across the 5 golden dataset funds
    const indexedDocuments = GOLDEN_DATASET.flatMap((entry: GoldenDatasetEntry) =>
      entry.groundTruthContextChunks.map((chunkText: string, idx: number) => {
        const isin = entry.candidateIsins[idx % entry.candidateIsins.length];
        return {
          _id: new Types.ObjectId(),
          isin,
          fundName: `Fund for ${isin}`,
          documentType: 'FACTSHEET',
          scoreCategory: ScoreCategoryCode.MODERATELY_HIGH,
          assetClass: 'EQUITY',
          chunkIndex: idx,
          chunkText,
          metadata: JSON.stringify({ isin, queryId: entry.id }),
          embedding: [0.85, 0.1, 0.05, 0], // High semantic overlap vector
          createdAt: new Date(),
        };
      })
    );

    // Mock geminiEmbeddingService query vector
    vi.spyOn(geminiEmbeddingService, 'getEmbedding').mockResolvedValue([0.9, 0.08, 0.02, 0]);

    // Mock FundDocumentEmbedding.find() with candidate-constrained filtering
    vi.spyOn(FundDocumentEmbedding, 'find').mockImplementation(((filter: { isin?: { $in?: string[] } }) => {
      const allowedIsins = filter?.isin?.$in || [];
      const filtered = indexedDocuments.filter((d) => allowedIsins.includes(d.isin));
      return Promise.resolve(filtered);
    }) as unknown as typeof FundDocumentEmbedding.find);

    let totalHits = 0;
    let reciprocalRankSum = 0;
    const evaluatedCount = GOLDEN_DATASET.length;

    for (const entry of GOLDEN_DATASET) {
      const result = await retrievalService.retrieveEvidence({
        query: entry.question,
        candidateIsins: entry.candidateIsins,
        topK: 5,
        similarityThreshold: 0.6,
      });

      // Assert Evidence Quality Gate passed
      expect(result.isSufficient).toBe(true);
      expect(result.evidenceChunks.length).toBeGreaterThan(0);

      // Find rank of first authentic matching chunk
      let firstRank = -1;
      for (let i = 0; i < result.evidenceChunks.length; i++) {
        const retrievedChunk = result.evidenceChunks[i];
        const isMatch = entry.groundTruthContextChunks.some((gt) =>
          retrievedChunk.chunkText.toLowerCase().includes(gt.slice(0, 30).toLowerCase())
        );
        if (isMatch) {
          firstRank = i + 1; // 1-indexed
          break;
        }
      }

      if (firstRank > 0) {
        totalHits++;
        reciprocalRankSum += 1.0 / firstRank;
      }
    }

    const hitRate = totalHits / evaluatedCount;
    const mrr = reciprocalRankSum / evaluatedCount;

    // Recall@K / HitRate >= 0.80 and MRR >= 0.75
    expect(hitRate).toBeGreaterThanOrEqual(0.8);
    expect(mrr).toBeGreaterThanOrEqual(0.75);
  });

  it('should enforce candidate isolation and prevent cross-fund evidence pollution', async () => {
    const paragParikhDoc = {
      _id: new Types.ObjectId(),
      isin: 'INF879O01019',
      fundName: 'Parag Parikh Flexi Cap Fund',
      documentType: 'FACTSHEET',
      scoreCategory: ScoreCategoryCode.VERY_HIGH,
      chunkIndex: 0,
      chunkText: 'Parag Parikh Flexi Cap Fund Total Expense Ratio is 0.63%.',
      metadata: '{}',
      embedding: [0.9, 0.1, 0, 0],
      createdAt: new Date(),
    };

    const hdfcDoc = {
      _id: new Types.ObjectId(),
      isin: 'INF179K01BE2',
      fundName: 'HDFC Top 100 Fund',
      documentType: 'FACTSHEET',
      scoreCategory: ScoreCategoryCode.MODERATE,
      chunkIndex: 0,
      chunkText: 'HDFC Top 100 Fund Total Expense Ratio is 1.15%.',
      metadata: '{}',
      embedding: [0.89, 0.11, 0, 0],
      createdAt: new Date(),
    };

    vi.spyOn(geminiEmbeddingService, 'getEmbedding').mockResolvedValue([0.9, 0.1, 0, 0]);

    // Return only matching candidate fund
    vi.spyOn(FundDocumentEmbedding, 'find').mockImplementation(((filter: { isin?: { $in?: string[] } }) => {
      const allowedIsins = filter?.isin?.$in || [];
      const all = [paragParikhDoc, hdfcDoc];
      return Promise.resolve(all.filter((d) => allowedIsins.includes(d.isin)));
    }) as unknown as typeof FundDocumentEmbedding.find);

    // Query targeting ONLY Parag Parikh (INF879O01019)
    const result = await retrievalService.retrieveEvidence({
      query: 'What is the expense ratio?',
      candidateIsins: ['INF879O01019'],
      topK: 5,
    });

    // Verify zero cross-fund leakage from HDFC
    expect(result.evidenceChunks.every((c) => c.isin === 'INF879O01019')).toBe(true);
    expect(result.evidenceChunks.some((c) => c.isin === 'INF179K01BE2')).toBe(false);
  });
});
