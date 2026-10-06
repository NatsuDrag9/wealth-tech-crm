import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { RagSynthesisService } from '../../src/modules/portfolioreview/services/ragSynthesisService';
import { ragRetrievalService } from '../../src/modules/portfolioreview/services/ragRetrievalService';
import { ragQueryRefinerService } from '../../src/modules/portfolioreview/services/ragQueryRefinerService';
import { geminiGenerationService, GeminiGenerationService } from '../../src/common/services/geminiGenerationService';
import { Client } from '../../src/modules/customer/models/Client';
import { ClientProfile } from '../../src/modules/customer/models/ClientProfile';
import { RagConversationTurn } from '../../src/modules/portfolioreview/models/RagConversationTurn';
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
    expect(response.conversationId).toBeDefined();
    expect(response.turnIndex).toBe(1);
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

  it('should inject prior conversation turns within window buffer memory into prompt and assign sequential turn indices', async () => {
    const conversationId = 'conv-multi-turn-001';

    // Mock existing 2 turns in history
    const priorTurns = [
      {
        turnIndex: 1,
        userQuery: 'What is the risk level of Parag Parikh Flexi Cap Fund?',
        synthesizedAnswer: 'Parag Parikh Flexi Cap Fund carries a Very High risk rating per SEBI Product Labeling [Source 1].',
        isGrounded: true,
      },
      {
        turnIndex: 2,
        userQuery: 'What is its Total Expense Ratio?',
        synthesizedAnswer: 'The Total Expense Ratio for the Direct Plan is 0.65% per annum [Source 2].',
        isGrounded: true,
      },
    ];

    const sortMock = vi.fn().mockResolvedValue(priorTurns);
    vi.spyOn(RagConversationTurn, 'find').mockReturnValue({
      sort: sortMock,
    } as unknown as ReturnType<typeof RagConversationTurn.find>);

    const createSpy = vi.spyOn(RagConversationTurn, 'create').mockResolvedValue({} as never);

    const mockRetrieval: RagRetrievalResponseDto = {
      query: 'What benchmark does it follow?',
      isSufficient: true,
      ragSimilarityScore: 0.91,
      evidenceConsistencyScore: 1.0,
      candidateIsins: ['INF879O01019'],
      evidenceChunks: [
        {
          id: 'chunk-bench',
          isin: 'INF879O01019',
          fundName: 'Parag Parikh Flexi Cap Fund',
          documentType: 'FACTSHEET',
          scoreCategory: 'AGGRESSIVE',
          chunkIndex: 1,
          chunkText: 'The benchmark index is NIFTY 500 Total Returns Index (TRI).',
          similarityScore: 0.91,
        },
      ],
      retrievalLatencyMs: 8,
      message: 'Quality gate passed',
    };

    vi.spyOn(ragRetrievalService, 'retrieveEvidence').mockResolvedValue(mockRetrieval);

    let promptSentToGemini = '';
    vi.spyOn(geminiGenerationService, 'generateGroundedResponse').mockImplementation(
      async (_sys: string, userPrompt: string) => {
        promptSentToGemini = userPrompt;
        return 'The fund follows the NIFTY 500 TRI benchmark index [Source 1].';
      }
    );

    const request: RagQueryRequestDto = {
      conversationId,
      query: 'What benchmark does it follow?',
      candidateIsins: ['INF879O01019'],
    };

    const response = await service.queryAndSynthesize(request);

    // Verify window buffer memory injection
    expect(promptSentToGemini).toContain('### PRIOR CONVERSATION HISTORY');
    expect(promptSentToGemini).toContain('User: What is the risk level of Parag Parikh Flexi Cap Fund?');
    expect(promptSentToGemini).toContain('User: What is its Total Expense Ratio?');
    expect(promptSentToGemini).toContain('### CURRENT USER QUERY');
    expect(promptSentToGemini).toContain('What benchmark does it follow?');

    // Verify sequential turn index
    expect(response.conversationId).toBe(conversationId);
    expect(response.turnIndex).toBe(3);
    expect(response.isGrounded).toBe(true);

    // Verify turn persistence
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId,
        turnIndex: 3,
        userQuery: 'What benchmark does it follow?',
        isGrounded: true,
      })
    );
  });

  it('should handle SYNTHESIS_UNAVAILABLE_SENTINEL gracefully by setting isGrounded to false and returning evidence chunks', async () => {
    const mockRetrieval: RagRetrievalResponseDto = {
      query: 'Explain ELSS tax saving details',
      isSufficient: true,
      ragSimilarityScore: 0.89,
      evidenceConsistencyScore: 1.0,
      candidateIsins: ['INF879O01035'],
      evidenceChunks: [
        {
          id: 'chunk-elss',
          isin: 'INF879O01035',
          fundName: 'Parag Parikh ELSS Tax Saver Fund',
          documentType: 'SID',
          scoreCategory: 'AGGRESSIVE',
          chunkIndex: 0,
          chunkText: 'Section 80C provides tax deduction up to INR 1.5 Lakh with 3 years statutory lock-in.',
          similarityScore: 0.89,
        },
      ],
      retrievalLatencyMs: 12,
      message: 'Quality gate passed',
    };

    vi.spyOn(ragRetrievalService, 'retrieveEvidence').mockResolvedValue(mockRetrieval);
    vi.spyOn(geminiGenerationService, 'generateGroundedResponse').mockResolvedValue(
      GeminiGenerationService.SYNTHESIS_UNAVAILABLE_SENTINEL
    );

    const request: RagQueryRequestDto = {
      query: 'Explain ELSS tax saving details',
      candidateIsins: ['INF879O01035'],
    };

    const response = await service.queryAndSynthesize(request);

    expect(response.isGrounded).toBe(false);
    expect(response.answer).toContain(GeminiGenerationService.SYNTHESIS_UNAVAILABLE_SENTINEL);
    expect(response.evidenceChunks).toHaveLength(1);
    expect(response.groundingStatus).toContain('AI generation capacity reached; authentic disclosure evidence provided for manual review.');
  });
});
