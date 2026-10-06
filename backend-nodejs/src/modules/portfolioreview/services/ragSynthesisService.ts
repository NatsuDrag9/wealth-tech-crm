import crypto from 'crypto';
import mongoose from 'mongoose';
import { config } from '../../../config/environment';
import { logger } from '../../../common/utils/logger';
import { ragSynthesisTotal } from '../../../common/metrics/metrics';
import { piiProtectionGateway, ClientIdentityContext } from '../../../common/services/piiProtectionGateway';
import { geminiGenerationService, GeminiGenerationService } from '../../../common/services/geminiGenerationService';
import { Client } from '../../customer/models/Client';
import { ClientProfile } from '../../customer/models/ClientProfile';
import { RagConversationTurn, IRagConversationTurn } from '../models/RagConversationTurn';
import { ragRetrievalService } from './ragRetrievalService';
import { ragQueryRefinerService } from './ragQueryRefinerService';
import {
  RagQueryRequestDto,
  RagQueryResponseDto,
  RagRetrievalRequestDto,
  RetrievedEvidenceChunkDto,
} from '../dto/ragDto';

/**
 * Service orchestrating grounded RAG query synthesis in Node.js:
 * 1. Resolves conversation session and fetches sliding history window (Approach A: Window Buffer Memory).
 * 2. Executes bidirectional PII tokenization to protect client identity before LLM ingestion.
 * 3. Executes candidate-constrained retrieval.
 * 4. Evaluates the Evidence Quality Gate.
 * 5. Triggers automated query refinement on quality gate failures.
 * 6. Assembles grounded context with explicit source anchors and prior conversation turns.
 * 7. Synthesizes factual natural-language answers via Google Gemini (with automatic model cascading).
 * 8. Rehydrates surrogate PII tokens into the final response before delivery.
 * 9. Persists dialogue turns in MongoDB for multi-turn continuity.
 * 10. Records granular end-to-end latency breakdowns and telemetry metrics.
 */
export class RagSynthesisService {
  private readonly defaultTopK: number;
  private readonly defaultSimilarityThreshold: number;
  private readonly defaultTemperature: number;
  private readonly maxHistoryTurns: number;

  constructor() {
    this.defaultTopK = config.rag.topK;
    this.defaultSimilarityThreshold = config.rag.similarityThreshold;
    this.defaultTemperature = config.gemini.generationTemperature;
    this.maxHistoryTurns = config.rag.maxHistoryTurns;
  }

  public async queryAndSynthesize(request: RagQueryRequestDto): Promise<RagQueryResponseDto> {
    const totalStartTime = Date.now();

    const topK = request.topK && request.topK > 0 ? Math.min(request.topK, 20) : this.defaultTopK;
    const threshold = request.similarityThreshold ?? this.defaultSimilarityThreshold;
    const temperature =
      request.temperature !== undefined && request.temperature >= 0.0 && request.temperature <= 1.0
        ? request.temperature
        : this.defaultTemperature;

    // 0. Resolve Conversation Session & Fetch Prior History Window (Approach A)
    const conversationId =
      request.conversationId && request.conversationId.trim().length > 0
        ? request.conversationId.trim()
        : crypto.randomUUID();

    let priorTurns: IRagConversationTurn[] = [];
    if (mongoose.connection.readyState === 1 || Object.prototype.hasOwnProperty.call(RagConversationTurn.find, 'mock')) {
      try {
        priorTurns = await RagConversationTurn.find({ conversationId }).sort({ turnIndex: 1 });
      } catch (err: unknown) {
        logger.warn({ err, conversationId }, 'Failed to fetch prior conversation turns');
      }
    }

    const historyWindow =
      priorTurns.length > this.maxHistoryTurns
        ? priorTurns.slice(priorTurns.length - this.maxHistoryTurns)
        : priorTurns;

    const maxTurnIndex =
      priorTurns.length > 0 ? Math.max(...priorTurns.map((t) => t.turnIndex)) : 0;
    const nextTurnIndex = maxTurnIndex + 1;

    // 1. Forward Pass: Bidirectional PII Minimization & Tokenization
    let clientContext: ClientIdentityContext | undefined;
    if (request.clientId) {
      try {
        const client = await Client.findById(request.clientId);
        if (client) {
          const profile = await ClientProfile.findOne({ client: client._id });
          clientContext = {
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            phone: client.phone,
            pan: client.pan,
            addressLine: profile?.addressLine,
            pincode: profile?.pincode,
          };
        }
      } catch (err: unknown) {
        logger.warn({ err, clientId: request.clientId }, 'Failed to load client identity context for PII tokenization');
      }
    }

    const tokenizedQuery = piiProtectionGateway.tokenize(request.query, clientContext);

    // 2. Initial Candidate-Constrained Retrieval
    const retrievalStartTime = Date.now();
    const retrievalReq: RagRetrievalRequestDto = {
      query: request.query,
      clientId: request.clientId,
      candidateIsins: request.candidateIsins,
      topK,
      similarityThreshold: threshold,
    };

    let retrievalResponse = await ragRetrievalService.retrieveEvidence(retrievalReq);
    let retrievalLatencyMs = Date.now() - retrievalStartTime;

    let queryWasRefined = false;

    // 3. Query Refinement Loop on Quality Gate Failure
    if (!retrievalResponse.isSufficient) {
      logger.info({ query: request.query }, 'Evidence quality gate failed. Initiating query refinement loop...');
      const refinedResult = ragQueryRefinerService.refineQuery(request.query);

      if (refinedResult.wasRefined) {
        queryWasRefined = true;
        const retryReq: RagRetrievalRequestDto = {
          query: refinedResult.refinedQuery,
          clientId: request.clientId,
          candidateIsins: request.candidateIsins,
          topK,
          similarityThreshold: threshold,
        };

        const retryStart = Date.now();
        const retryResponse = await ragRetrievalService.retrieveEvidence(retryReq);
        retrievalLatencyMs += Date.now() - retryStart;

        if (retryResponse.isSufficient || retryResponse.ragSimilarityScore > retrievalResponse.ragSimilarityScore) {
          logger.info(
            { prevScore: retrievalResponse.ragSimilarityScore, newScore: retryResponse.ragSimilarityScore },
            'Query refinement improved evidence relevance'
          );
          retrievalResponse = retryResponse;
        }
      }
    }

    // 4. Defensive Degradation if Evidence Remains Insufficient
    if (!retrievalResponse.isSufficient || retrievalResponse.evidenceChunks.length === 0) {
      ragSynthesisTotal.inc({ grounded: 'false' });
      const totalLatency = Date.now() - totalStartTime;

      const defensiveAnswer = `Based on official mutual fund regulatory disclosures, no verified document chunks met the required quality relevance threshold (${threshold.toFixed(2)}) to answer your query reliably. The highest matching relevance was ${retrievalResponse.ragSimilarityScore.toFixed(2)}. To prevent ungrounded information, please refine your search or specify a particular fund scheme.`;

      await this.persistTurn(
        conversationId,
        nextTurnIndex,
        request.query,
        defensiveAnswer,
        false,
        request.clientId
      );

      return {
        query: request.query,
        conversationId,
        turnIndex: nextTurnIndex,
        answer: defensiveAnswer,
        isGrounded: false,
        queryWasRefined,
        ragSimilarityScore: retrievalResponse.ragSimilarityScore,
        citations: [],
        evidenceChunks: retrievalResponse.evidenceChunks,
        retrievalLatencyMs,
        synthesisLatencyMs: 0,
        totalLatencyMs: totalLatency,
        groundingStatus: 'Grounded synthesis bypassed: Evidence quality gate was not satisfied.',
      };
    }

    // 5. Grounded Context Assembly (Evidence + Window Buffer History)
    const systemInstruction = `You are an expert SEBI-compliant Wealth Management Copilot for financial advisors.
Your task is to answer the user's investment query using EXCLUSIVELY the provided Grounded Evidence.
Rules:
1. Every financial figure, expense ratio, asset allocation percentage, and risk evaluation MUST have an inline source citation tag matching its Source block (e.g. [Source 1], [Source 2]).
2. NEVER extrapolate, assume, or invent statistics not explicitly stated in the evidence.
3. If the evidence does not fully disclose an answer to a specific sub-question, explicitly state that official disclosures do not mention it.
4. Keep the tone professional, objective, and compliant with financial advisory standards.
5. When conversation history is provided, use it to resolve contextual follow-up references accurately.`;

    const groundedPrompt = this.assembleGroundedPrompt(
      tokenizedQuery.sanitizedText,
      retrievalResponse.evidenceChunks,
      historyWindow
    );

    // 6. LLM Synthesis via Gemini (with automatic model cascading on 429)
    const synthesisStartTime = Date.now();
    const synthesizedAnswer = await geminiGenerationService.generateGroundedResponse(
      systemInstruction,
      groundedPrompt,
      temperature
    );
    const synthesisLatencyMs = Date.now() - synthesisStartTime;

    // 7. Check for Graceful Unavailable Sentinel vs Grounded Answer
    const isGrounded = !GeminiGenerationService.isSynthesisUnavailable(synthesizedAnswer);
    ragSynthesisTotal.inc({ grounded: String(isGrounded) });

    // 8. Backward Pass: De-tokenization / Re-hydration
    const rehydratedAnswer = tokenizedQuery.rehydrate(synthesizedAnswer);

    // 9. Persist Dialogue Turn for Multi-Turn Context (Approach A)
    await this.persistTurn(
      conversationId,
      nextTurnIndex,
      request.query,
      rehydratedAnswer,
      isGrounded,
      request.clientId
    );

    // 10. Format Citations List
    const citations = this.extractCitations(retrievalResponse.evidenceChunks);
    const totalLatencyMs = Date.now() - totalStartTime;

    const groundingStatus = isGrounded
      ? `Successfully synthesized grounded answer backed by ${citations.length} authentic disclosure sources.`
      : 'AI generation capacity reached; authentic disclosure evidence provided for manual review.';

    return {
      query: request.query,
      conversationId,
      turnIndex: nextTurnIndex,
      answer: rehydratedAnswer,
      isGrounded,
      queryWasRefined,
      ragSimilarityScore: retrievalResponse.ragSimilarityScore,
      citations,
      evidenceChunks: retrievalResponse.evidenceChunks,
      retrievalLatencyMs,
      synthesisLatencyMs,
      totalLatencyMs,
      groundingStatus,
    };
  }

  private async persistTurn(
    conversationId: string,
    turnIndex: number,
    query: string,
    answer: string,
    isGrounded: boolean,
    clientId?: string
  ): Promise<void> {
    if (mongoose.connection.readyState !== 1 && !Object.prototype.hasOwnProperty.call(RagConversationTurn.create, 'mock')) {
      return;
    }
    try {
      await RagConversationTurn.create({
        conversationId,
        turnIndex,
        userQuery: query,
        synthesizedAnswer: answer,
        isGrounded,
        clientId,
        createdAt: new Date(),
      });
    } catch (error: unknown) {
      logger.warn({ err: error, conversationId, turnIndex }, 'Failed to persist conversation turn');
    }
  }

  private assembleGroundedPrompt(
    userQuery: string,
    evidenceChunks: RetrievedEvidenceChunkDto[],
    historyWindow: IRagConversationTurn[]
  ): string {
    const sb: string[] = [];

    // Inject prior conversation turns (Approach A: Window Buffer Memory)
    if (historyWindow && historyWindow.length > 0) {
      sb.push('### PRIOR CONVERSATION HISTORY');
      for (const turn of historyWindow) {
        sb.push(`User: ${turn.userQuery.trim()}\nAdvisor Copilot: ${turn.synthesizedAnswer.trim()}\n`);
      }
    }

    sb.push('### CURRENT USER QUERY');
    sb.push(userQuery);
    sb.push('');
    sb.push('### GROUNDED EVIDENCE (AUTHENTIC SEBI DISCLOSURE DOCUMENTS)');

    for (let i = 0; i < evidenceChunks.length; i++) {
      const chunk = evidenceChunks[i];
      sb.push(
        `[Source ${i + 1}: ${chunk.fundName} | ${chunk.documentType} | ISIN: ${chunk.isin} | Relevance: ${chunk.similarityScore.toFixed(2)}]`
      );
      sb.push(chunk.chunkText.trim());
      sb.push('');
    }

    sb.push('### INSTRUCTIONS');
    sb.push('Synthesize a comprehensive, factual answer citing the bracketed source tags (e.g. [Source 1]) for all facts.');

    return sb.join('\n');
  }

  private extractCitations(evidenceChunks: RetrievedEvidenceChunkDto[]): string[] {
    return evidenceChunks.map(
      (chunk, i) => `[Source ${i + 1}] ${chunk.fundName} (${chunk.documentType}, ISIN: ${chunk.isin})`
    );
  }
}

export const ragSynthesisService = new RagSynthesisService();
