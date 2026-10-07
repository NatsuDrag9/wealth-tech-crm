import { baseApi } from './baseApi';
import { ENDPOINTS } from '@/constants/endpoints';
import { getActiveBackend } from '@/config/backendConfig';
import type {
  RagQueryRequest,
  RagQueryResponse,
  RetrievedEvidenceChunk,
  RawRagEvidenceWire,
  RawRagResponseWire,
} from '@/definitions/ragTypes';

function normalizeEvidenceChunk(raw: RawRagEvidenceWire): RetrievedEvidenceChunk {
  return {
    id: raw.id,
    isin: raw.isin ?? '',
    fundName: raw.fund_name ?? raw.fundName ?? '',
    documentType: raw.document_type ?? raw.documentType ?? '',
    scoreCategory: raw.score_category ?? raw.scoreCategory,
    assetClass: raw.asset_class ?? raw.assetClass,
    chunkIndex: raw.chunk_index ?? raw.chunkIndex,
    chunkText: raw.chunk_text ?? raw.chunkText ?? '',
    metadata: raw.metadata,
    similarityScore: Number(
      raw.similarity_score ?? raw.similarityScore ?? raw.hybrid_score ?? raw.hybridScore ?? 0,
    ),
  };
}

function normalizeRagResponse(res: RawRagResponseWire): RagQueryResponse {
  const rawChunks = res.evidence_chunks ?? res.evidenceChunks ?? [];
  return {
    query: res.query ?? '',
    conversationId: res.conversation_id ?? res.conversationId ?? `conv-${Date.now()}`,
    turnIndex: Number(res.turn_index ?? res.turnIndex ?? 1),
    answer: res.synthesized_answer ?? res.answer ?? '',
    isGrounded: Boolean(res.is_grounded ?? res.isGrounded ?? false),
    queryWasRefined: Boolean(
      res.query_refined ?? res.query_was_refined ?? res.queryWasRefined ?? false,
    ),
    similarityScore: res.similarity_score
      ?? res.similarityScore
      ?? res.rag_similarity_score
      ?? res.ragSimilarityScore,
    citations: res.citations ?? [],
    evidenceChunks: rawChunks.map(normalizeEvidenceChunk),
    retrievalLatencyMs: Number(res.retrieval_latency_ms ?? res.retrievalLatencyMs ?? 0),
    synthesisLatencyMs: Number(res.synthesis_latency_ms ?? res.synthesisLatencyMs ?? 0),
    totalLatencyMs: Number(res.total_latency_ms ?? res.totalLatencyMs ?? 0),
    message: res.message,
  };
}

export const ragApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    queryRag: builder.mutation<RagQueryResponse, RagQueryRequest>({
      query: (body) => {
        const isJava = getActiveBackend() === 'java';
        const url = isJava ? 'rag/query' : ENDPOINTS.RAG_QUERY;

        return {
          url,
          method: 'POST',
          body: {
            query: body.query,
            conversationId: body.conversationId,
            clientId: body.clientId ? Number(body.clientId) : undefined,
            candidateIsins: body.candidateIsins,
            topK: body.topK,
            similarityThreshold: body.similarityThreshold,
            temperature: body.temperature,
          },
        };
      },
      transformResponse: (response: RawRagResponseWire) => normalizeRagResponse(response),
    }),
  }),
});

export const { useQueryRagMutation } = ragApi;
