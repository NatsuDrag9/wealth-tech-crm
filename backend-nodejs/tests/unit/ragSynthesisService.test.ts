import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { RagSynthesisService } from '../../src/modules/portfolioreview/services/ragSynthesisService';
import { ragRetrievalService } from '../../src/modules/portfolioreview/services/ragRetrievalService';
import { ragQueryRefinerService } from '../../src/modules/portfolioreview/services/ragQueryRefinerService';
import { geminiGenerationService } from '../../src/common/services/geminiGenerationService';
import { Client } from '../../src/modules/customer/models/Client';
import { ClientProfile } from '../../src/modules/customer/models/ClientProfile';
import { RagQueryRequestDto, RagRetrievalResponseDto } from '../../src/modules/portfolioreview/dto/ragDto';

describe('RagSynthesisService (Grounded Synthesis & PII Protection)', () => {
  let service: RagSynthesisService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new RagSynthesisService();
  });

  it('should synthesize a grounded answer citing evidence chunks when quality gate passes', async () => {
    const mockRetrievalResponse: RagRetrievalResponseDto = {
      query: 'What is the expense ratio for HDFC Top 100?',
      isSufficient: true,
      ragSimilarityScore: 0.92,
      evidenceConsistencyScore: 1.0,
      candidateIsins: ['INF179K01BE2'],
      evidenceChunks: [
        {
          id: 'chunk-1',
          isin: 'INF179K01BE2',
          fundName: 'HDFC Top 100 Fund',
          documentType: 'FACTSHEET',
          scoreCategory: 'MODERATE',
          chunkIndex: 0,
          chunkText: 'The Total Expense Ratio for HDFC Top 100 Direct Plan is 1.15% per annum.',
          similarityScore: 0.92,
        },
      ],
      retrievalLatencyMs: 12,
      message: 'Quality gate passed',
    };

    vi.spyOn(ragRetrievalService, 'retrieveEvidence').mockResolvedValue(mockRetrievalResponse);
    vi.spyOn(geminiGenerationService, 'generateGroundedResponse').mockResolvedValue(
      'According to [Source 1], the Total Expense Ratio for HDFC Top 100 Direct Plan is 1.15% per annum.'
    );

    const request: RagQueryRequestDto = {
      query: 'What is the expense ratio for HDFC Top 100?',
      candidateIsins: ['INF179K01BE2'],
    };

    const response = await service.queryAndSynthesize(request);

    expect(response.isGrounded).toBe(true);
    expect(response.queryWasRefined).toBe(false);
    expect(response.ragSimilarityScore).toBe(0.92);
    expect(response.answer).toContain('1.15% per annum');
    expect(response.citations).toHaveLength(1);
    expect(response.citations[0]).toContain('HDFC Top 100 Fund');
  });

  it('should tokenize client PII in prompt and rehydrate in the synthesized response', async () => {
    const clientId = new Types.ObjectId().toString();

    // Mock client and profile
    vi.spyOn(Client, 'findById').mockResolvedValue({
      _id: new Types.ObjectId(clientId),
      firstName: 'Aarav',
      lastName: 'Sharma',
      email: 'aarav.sharma@example.com',
      phone: '9876543210',
      pan: 'ABCDE1234F',
    } as unknown as ReturnType<typeof Client.findById>);

    vi.spyOn(ClientProfile, 'findOne').mockResolvedValue({
      addressLine: '123 MG Road',
      pincode: '560001',
    } as unknown as ReturnType<typeof ClientProfile.findOne>);

    const mockRetrievalResponse: RagRetrievalResponseDto = {
      query: 'Client Aarav Sharma with PAN ABCDE1234F asks for HDFC TER',
      isSufficient: true,
      ragSimilarityScore: 0.88,
      evidenceConsistencyScore: 1.0,
      candidateIsins: ['INF179K01BE2'],
      evidenceChunks: [
        {
          id: 'chunk-1',
          isin: 'INF179K01BE2',
          fundName: 'HDFC Top 100 Fund',
          documentType: 'FACTSHEET',
          scoreCategory: 'MODERATE',
          chunkIndex: 0,
          chunkText: 'Total Expense Ratio is 1.15%.',
          similarityScore: 0.88,
        },
      ],
      retrievalLatencyMs: 10,
      message: 'Quality gate passed',
    };

    vi.spyOn(ragRetrievalService, 'retrieveEvidence').mockResolvedValue(mockRetrievalResponse);

    // Capture prompt passed to geminiGenerationService
    let capturedPrompt = '';
    vi.spyOn(geminiGenerationService, 'generateGroundedResponse').mockImplementation(
      async (_sys: string, userPrompt: string) => {
        capturedPrompt = userPrompt;
        // LLM echoes surrogate token
        return 'For client {{CLIENT_PAN_1}} ({{CLIENT_NAME_1}}), the expense ratio is 1.15% per [Source 1].';
      }
    );

    const request: RagQueryRequestDto = {
      query: 'Client Aarav Sharma with PAN ABCDE1234F asks for HDFC TER',
      clientId,
    };

    const response = await service.queryAndSynthesize(request);

    // Verify forward tokenization: Raw PAN and name must NOT appear in the prompt sent to LLM
    expect(capturedPrompt).not.toContain('ABCDE1234F');
    expect(capturedPrompt).not.toContain('Aarav Sharma');
    expect(capturedPrompt).toContain('{{CLIENT_PAN_1}}');
    expect(capturedPrompt).toContain('{{CLIENT_NAME_1}}');

    // Verify backward de-tokenization: Final response rehydrates original values
    expect(response.answer).toContain('ABCDE1234F');
    expect(response.answer).toContain('Aarav Sharma');
    expect(response.answer).not.toContain('{{CLIENT_PAN_1}}');
  });

  it('should trigger query refinement loop when initial retrieval fails the quality gate', async () => {
    const initialFailure: RagRetrievalResponseDto = {
      query: 'fee cost overview',
      isSufficient: false,
      ragSimilarityScore: 0.55,
      evidenceConsistencyScore: 1.0,
      candidateIsins: ['INF179K01BE2'],
      evidenceChunks: [],
      retrievalLatencyMs: 15,
      message: 'Quality gate failed',
    };

    const refinedSuccess: RagRetrievalResponseDto = {
      query: 'fee cost overview Total Expense Ratio TER Direct Plan Regular Plan expense disclosure',
      isSufficient: true,
      ragSimilarityScore: 0.86,
      evidenceConsistencyScore: 1.0,
      candidateIsins: ['INF179K01BE2'],
      evidenceChunks: [
        {
          id: 'chunk-1',
          isin: 'INF179K01BE2',
          fundName: 'HDFC Top 100 Fund',
          documentType: 'FACTSHEET',
          scoreCategory: 'MODERATE',
          chunkIndex: 0,
          chunkText: 'Total Expense Ratio for Direct Plan is 1.15%.',
          similarityScore: 0.86,
        },
      ],
      retrievalLatencyMs: 14,
      message: 'Quality gate passed after refinement',
    };

    vi.spyOn(ragRetrievalService, 'retrieveEvidence')
      .mockResolvedValueOnce(initialFailure)
      .mockResolvedValueOnce(refinedSuccess);

    vi.spyOn(ragQueryRefinerService, 'refineQuery').mockReturnValue({
      originalQuery: 'fee cost overview',
      refinedQuery: 'fee cost overview Total Expense Ratio TER Direct Plan Regular Plan expense disclosure',
      wasRefined: true,
      refinementStrategy: 'EXPENSE_RATIO_EXPANSION',
    });

    vi.spyOn(geminiGenerationService, 'generateGroundedResponse').mockResolvedValue(
      'The Direct Plan expense ratio is 1.15% [Source 1].'
    );

    const request: RagQueryRequestDto = {
      query: 'fee cost overview',
      candidateIsins: ['INF179K01BE2'],
    };

    const response = await service.queryAndSynthesize(request);

    expect(response.isGrounded).toBe(true);
    expect(response.queryWasRefined).toBe(true);
    expect(response.ragSimilarityScore).toBe(0.86);
    expect(response.answer).toContain('1.15%');
  });

  it('should defensibly degrade without calling LLM when evidence remains insufficient after refinement', async () => {
    const failureResponse: RagRetrievalResponseDto = {
      query: 'Unknown query',
      isSufficient: false,
      ragSimilarityScore: 0.42,
      evidenceConsistencyScore: 0.0,
      candidateIsins: ['INF179K01BE2'],
      evidenceChunks: [],
      retrievalLatencyMs: 10,
      message: 'Quality gate failed',
    };

    vi.spyOn(ragRetrievalService, 'retrieveEvidence').mockResolvedValue(failureResponse);

    const geminiSpy = vi.spyOn(geminiGenerationService, 'generateGroundedResponse');

    const request: RagQueryRequestDto = {
      query: 'Unknown query',
      candidateIsins: ['INF179K01BE2'],
      similarityThreshold: 0.7,
    };

    const response = await service.queryAndSynthesize(request);

    // LLM must NOT be called when quality gate fails to prevent hallucination
    expect(geminiSpy).not.toHaveBeenCalled();
    expect(response.isGrounded).toBe(false);
    expect(response.answer).toContain('no verified document chunks met the required quality relevance threshold');
    expect(response.citations).toEqual([]);
    expect(response.groundingStatus).toContain('Grounded synthesis bypassed');
  });
});
