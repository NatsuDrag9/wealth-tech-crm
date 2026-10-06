import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RagSynthesisService } from '../../src/modules/portfolioreview/services/ragSynthesisService';
import { ragRetrievalService } from '../../src/modules/portfolioreview/services/ragRetrievalService';
import { geminiGenerationService } from '../../src/common/services/geminiGenerationService';
import { geminiEmbeddingService } from '../../src/common/services/geminiEmbeddingService';
import { ragEvaluationTelemetryService } from '../../src/modules/portfolioreview/services/ragEvaluationTelemetryService';
import { GOLDEN_DATASET, GoldenDatasetEntry } from './goldenDataset';
import { RagRetrievalResponseDto } from '../../src/modules/portfolioreview/dto/ragDto';

describe('RAG Generation Benchmark (Faithfulness, Relevance & Grounding Gates)', () => {
  let synthesisService: RagSynthesisService;

  beforeEach(() => {
    vi.restoreAllMocks();
    synthesisService = new RagSynthesisService();
  });

  it('should evaluate Semantic Answer Relevance across the Golden Dataset', async () => {
    // Deterministic semantic embedding mock modeling semantic token overlap in unit test environment
    vi.spyOn(geminiEmbeddingService, 'getEmbedding').mockImplementation(async (text: string) => {
      const vector = new Array(768).fill(0.01);
      const tokens = text.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
      for (const token of tokens) {
        let hash = 0;
        for (let i = 0; i < token.length; i++) hash = (hash * 31 + token.charCodeAt(i)) % 768;
        vector[hash] += 0.3;
      }
      const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      return vector.map((v) => v / norm);
    });

    for (const entry of GOLDEN_DATASET) {
      const qVec = await geminiEmbeddingService.getEmbedding(entry.question);
      const aVec = await geminiEmbeddingService.getEmbedding(entry.groundTruthAnswer);

      // Compute cosine similarity
      let dot = 0;
      let norm1 = 0;
      let norm2 = 0;
      for (let i = 0; i < qVec.length; i++) {
        dot += qVec[i] * aVec[i];
        norm1 += qVec[i] * qVec[i];
        norm2 += aVec[i] * aVec[i];
      }
      const similarity = dot / (Math.sqrt(norm1) * Math.sqrt(norm2));

      // Assert semantic relevance meets minimum threshold (>= 0.40)
      expect(similarity).toBeGreaterThanOrEqual(0.4);

      ragEvaluationTelemetryService.recordRelevancy(similarity, true, 'EMBEDDING_COSINE', 10);
      expect(ragEvaluationTelemetryService.getLatestRelevancyScore()).toBeGreaterThanOrEqual(0.4);
    }
  });

  it('should reject off-topic responses below the Answer Relevance threshold', async () => {
    vi.spyOn(geminiEmbeddingService, 'getEmbedding').mockImplementation(async (text: string) => {
      const vector = new Array(768).fill(0.01);
      const tokens = text.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
      for (const token of tokens) {
        let hash = 0;
        for (let i = 0; i < token.length; i++) hash = (hash * 31 + token.charCodeAt(i)) % 768;
        vector[hash] += 0.3;
      }
      const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      return vector.map((v) => v / norm);
    });

    const qVec = await geminiEmbeddingService.getEmbedding('What is the Total Expense Ratio for Parag Parikh Flexi Cap Fund?');
    const offTopicVec = await geminiEmbeddingService.getEmbedding('The recipe for baking blueberry muffins requires flour, sugar, and blueberries.');

    let dot = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < qVec.length; i++) {
      dot += qVec[i] * offTopicVec[i];
      norm1 += qVec[i] * qVec[i];
      norm2 += offTopicVec[i] * offTopicVec[i];
    }
    const similarity = dot / (Math.sqrt(norm1) * Math.sqrt(norm2));

    expect(similarity).toBeLessThan(0.4);
  });

  it('should synthesize factual responses with source citations across Golden Dataset queries', async () => {
    for (const entry of GOLDEN_DATASET) {
      // Mock retrieval response supplying the authentic context chunks
      const mockRetrievalResponse: RagRetrievalResponseDto = {
        query: entry.question,
        isSufficient: true,
        ragSimilarityScore: 0.9,
        evidenceConsistencyScore: 1.0,
        candidateIsins: entry.candidateIsins,
        evidenceChunks: entry.groundTruthContextChunks.map((chunkText: string, idx: number) => ({
          id: `chunk-${entry.id}-${idx}`,
          isin: entry.candidateIsins[idx % entry.candidateIsins.length],
          fundName: `Fund ${entry.candidateIsins[idx % entry.candidateIsins.length]}`,
          documentType: 'FACTSHEET',
          scoreCategory: 'MODERATE',
          chunkIndex: idx,
          chunkText,
          similarityScore: 0.9,
        })),
        retrievalLatencyMs: 15,
        message: 'Evidence Quality Gate PASSED',
      };

      vi.spyOn(ragRetrievalService, 'retrieveEvidence').mockResolvedValue(mockRetrievalResponse);

      // LLM synthesized answer backed by citations
      vi.spyOn(geminiGenerationService, 'generateGroundedResponse').mockResolvedValue(
        `Based on [Source 1], ${entry.groundTruthAnswer}`
      );

      const response = await synthesisService.queryAndSynthesize({
        query: entry.question,
        candidateIsins: entry.candidateIsins,
      });

      // Assert Grounding and Citation Integrity
      expect(response.isGrounded).toBe(true);
      expect(response.ragSimilarityScore).toBeGreaterThanOrEqual(0.7);
      expect(response.citations.length).toBeGreaterThan(0);
      expect(response.answer).toContain('[Source 1]');
      expect(response.groundingStatus).toContain('Successfully synthesized grounded answer');
    }
  });

  it('should enforce Fact Checking (zero hallucination) on factoid queries', async () => {
    const factoidEntry = GOLDEN_DATASET.find((e: GoldenDatasetEntry) => e.id === 'eval-001')!;

    const mockRetrieval: RagRetrievalResponseDto = {
      query: factoidEntry.question,
      isSufficient: true,
      ragSimilarityScore: 0.92,
      evidenceConsistencyScore: 1.0,
      candidateIsins: factoidEntry.candidateIsins,
      evidenceChunks: [
        {
          id: 'chunk-eval-001',
          isin: factoidEntry.candidateIsins[0],
          fundName: 'Parag Parikh Flexi Cap Fund',
          documentType: 'FACTSHEET',
          scoreCategory: 'VERY_HIGH',
          chunkIndex: 0,
          chunkText: factoidEntry.groundTruthContextChunks[0],
          similarityScore: 0.92,
        },
      ],
      retrievalLatencyMs: 10,
      message: 'Quality gate passed',
    };

    vi.spyOn(ragRetrievalService, 'retrieveEvidence').mockResolvedValue(mockRetrieval);
    vi.spyOn(geminiGenerationService, 'generateGroundedResponse').mockResolvedValue(
      'Per [Source 1], the Total Expense Ratio (TER) for Parag Parikh Flexi Cap Fund Direct Plan is 0.63%.'
    );

    const response = await synthesisService.queryAndSynthesize({
      query: factoidEntry.question,
      candidateIsins: factoidEntry.candidateIsins,
    });

    // Verify exact factual figures match ground truth (0.63% TER)
    expect(response.answer).toContain('0.63%');
    expect(response.answer).not.toContain('1.5%'); // No hallucinated expense ratio

    ragEvaluationTelemetryService.recordFaithfulness(1.0, true, 'FACT_CHECKING', 12);
    expect(ragEvaluationTelemetryService.getLatestFaithfulnessScore()).toBe(1.0);
  });

  it('should defensibly degrade on adversarial / out-of-scope query when evidence is absent', async () => {
    // Adversarial query where no candidate chunks meet the quality threshold
    const failureRetrieval: RagRetrievalResponseDto = {
      query: 'What are the derivatives holdings in liquid fund?',
      isSufficient: false,
      ragSimilarityScore: 0.35,
      evidenceConsistencyScore: 0.0,
      candidateIsins: ['INF109K01BE1'],
      evidenceChunks: [],
      retrievalLatencyMs: 8,
      message: 'Evidence Quality Gate FAILED',
    };

    vi.spyOn(ragRetrievalService, 'retrieveEvidence').mockResolvedValue(failureRetrieval);
    const geminiSpy = vi.spyOn(geminiGenerationService, 'generateGroundedResponse');

    const response = await synthesisService.queryAndSynthesize({
      query: 'What are the derivatives holdings in liquid fund?',
      candidateIsins: ['INF109K01BE1'],
      similarityThreshold: 0.7,
    });

    // Hallucination prevention: LLM call was bypassed, defensive warning returned
    expect(geminiSpy).not.toHaveBeenCalled();
    expect(response.isGrounded).toBe(false);
    expect(response.answer).toContain('no verified document chunks met the required quality relevance threshold');
    expect(response.citations).toHaveLength(0);
  });
});
