import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiGenerationService } from '../../src/common/services/geminiGenerationService';

describe('GeminiGenerationService (Model Cascading & Differentiated Failure Policies)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should identify SYNTHESIS_UNAVAILABLE_SENTINEL using isSynthesisUnavailable helper', () => {
    expect(
      GeminiGenerationService.isSynthesisUnavailable(
        GeminiGenerationService.SYNTHESIS_UNAVAILABLE_SENTINEL
      )
    ).toBe(true);
    expect(
      GeminiGenerationService.isSynthesisUnavailable('[SYNTHESIS_UNAVAILABLE: Service capacity exceeded]')
    ).toBe(true);
    expect(
      GeminiGenerationService.isSynthesisUnavailable('Regular synthesized response with [Source 1]')
    ).toBe(false);
    expect(GeminiGenerationService.isSynthesisUnavailable(null)).toBe(false);
    expect(GeminiGenerationService.isSynthesisUnavailable('')).toBe(false);
  });

  it('should return deterministic local fallback when GEMINI_API_KEY is not configured', async () => {
    const service = new GeminiGenerationService();
    vi.spyOn(service, 'isLiveKeyConfigured').mockReturnValue(false);

    const userPrompt = `### CURRENT USER QUERY\nWhat is the expense ratio?\n\n### GROUNDED EVIDENCE\n[Source 1: HDFC Top 100 | FACTSHEET | ISIN: INF179K01BE2 | Relevance: 0.90]\nTER is 1.15%`;
    const response = await service.generateGroundedResponse('System instruction', userPrompt);

    expect(response).toContain('Grounded Advisory Summary');
    expect(response).toContain('[Source 1]');
    expect(response).toContain('offline deterministic fallback engine');
  });

  it('should successfully generate response when primary model returns HTTP 200', async () => {
    const service = new GeminiGenerationService();
    vi.spyOn(service, 'isLiveKeyConfigured').mockReturnValue(true);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'The TER for Parag Parikh Flexi Cap Fund is 0.65% [Source 1].' }],
            },
          },
        ],
      }),
    });
    global.fetch = mockFetch;

    const response = await service.generateGroundedResponse(
      'System instruction',
      'User prompt with evidence'
    );

    expect(response).toBe('The TER for Parag Parikh Flexi Cap Fund is 0.65% [Source 1].');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain('gemini-2.0-flash');
  });

  it('should cascade to secondary model immediately upon HTTP 429 quota exhaustion without retrying primary', async () => {
    const service = new GeminiGenerationService();
    vi.spyOn(service, 'isLiveKeyConfigured').mockReturnValue(true);

    const mockFetch = vi
      .fn()
      // First call (Primary: gemini-2.0-flash) -> 429 Quota Exhausted
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'RESOURCE_EXHAUSTED: Rate limit exceeded',
      })
      // Second call (Secondary: gemini-3.5-flash) -> 200 Success
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Cascade successful: TER is 0.65% per annum [Source 1].' }],
              },
            },
          ],
        }),
      });
    global.fetch = mockFetch;

    const response = await service.generateGroundedResponse(
      'System instruction',
      'User prompt with evidence'
    );

    expect(response).toBe('Cascade successful: TER is 0.65% per annum [Source 1].');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    // Verified: First call tried primary model
    expect(mockFetch.mock.calls[0][0]).toContain('gemini-2.0-flash');
    // Verified: Second call immediately cascaded to gemini-3.5-flash
    expect(mockFetch.mock.calls[1][0]).toContain('gemini-3.5-flash');
  });

  it('should cascade across all fallback models and return SYNTHESIS_UNAVAILABLE_SENTINEL when all quotas are exhausted', async () => {
    const service = new GeminiGenerationService();
    vi.spyOn(service, 'isLiveKeyConfigured').mockReturnValue(true);

    const mockFetch = vi
      .fn()
      // Primary: gemini-2.0-flash -> 429
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Primary 429 quota exhausted',
      })
      // Secondary: gemini-3.5-flash -> 429
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Secondary 429 quota exhausted',
      })
      // Tertiary: gemini-flash-latest -> 429
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Tertiary 429 quota exhausted',
      });
    global.fetch = mockFetch;

    const response = await service.generateGroundedResponse(
      'System instruction',
      'User prompt with evidence'
    );

    expect(GeminiGenerationService.isSynthesisUnavailable(response)).toBe(true);
    expect(response).toBe(GeminiGenerationService.SYNTHESIS_UNAVAILABLE_SENTINEL);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should retry with exponential backoff on HTTP 503 transient error on the same model', async () => {
    const service = new GeminiGenerationService();
    vi.spyOn(service, 'isLiveKeyConfigured').mockReturnValue(true);

    const mockFetch = vi
      .fn()
      // Attempt 1: 503 Service Unavailable
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Transient service unavailable',
      })
      // Attempt 2: 200 Success on same model
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Recovered after transient 503: TER is 0.65% [Source 1].' }],
              },
            },
          ],
        }),
      });
    global.fetch = mockFetch;

    const response = await service.generateGroundedResponse(
      'System instruction',
      'User prompt with evidence'
    );

    expect(response).toBe('Recovered after transient 503: TER is 0.65% [Source 1].');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    // Verified: Both attempts used the same primary model
    expect(mockFetch.mock.calls[0][0]).toContain('gemini-2.0-flash');
    expect(mockFetch.mock.calls[1][0]).toContain('gemini-2.0-flash');
  });
});
