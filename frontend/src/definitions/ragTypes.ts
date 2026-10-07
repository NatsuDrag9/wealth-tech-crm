export interface RetrievedEvidenceChunk {
  id?: string | number;
  isin: string;
  fundName: string;
  documentType: string;
  scoreCategory?: string;
  assetClass?: string;
  chunkIndex?: number;
  chunkText: string;
  metadata?: string;
  similarityScore?: number;
}

export interface RagQueryRequest {
  query: string;
  conversationId?: string;
  clientId?: string | number;
  candidateIsins?: string[];
  topK?: number;
  similarityThreshold?: number;
  temperature?: number;
}

export interface RagQueryResponse {
  query: string;
  conversationId: string;
  turnIndex: number;
  answer: string;
  isGrounded: boolean;
  queryWasRefined?: boolean;
  similarityScore?: number;
  citations: string[];
  evidenceChunks: RetrievedEvidenceChunk[];
  retrievalLatencyMs?: number;
  synthesisLatencyMs?: number;
  totalLatencyMs?: number;
  message?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isGrounded?: boolean;
  citations?: string[];
  evidenceChunks?: RetrievedEvidenceChunk[];
  latencyMs?: number;
  similarityScore?: number;
}

export interface RawRagEvidenceWire {
  id?: string | number;
  isin?: string;
  fund_name?: string;
  fundName?: string;
  document_type?: string;
  documentType?: string;
  score_category?: string;
  scoreCategory?: string;
  asset_class?: string;
  assetClass?: string;
  chunk_index?: number;
  chunkIndex?: number;
  chunk_text?: string;
  chunkText?: string;
  metadata?: string;
  similarity_score?: number;
  similarityScore?: number;
  hybrid_score?: number;
  hybridScore?: number;
}

export interface RawRagResponseWire {
  query?: string;
  conversation_id?: string;
  conversationId?: string;
  turn_index?: number;
  turnIndex?: number;
  synthesized_answer?: string;
  answer?: string;
  is_grounded?: boolean;
  isGrounded?: boolean;
  query_refined?: boolean;
  query_was_refined?: boolean;
  queryWasRefined?: boolean;
  similarity_score?: number;
  similarityScore?: number;
  rag_similarity_score?: number;
  ragSimilarityScore?: number;
  citations?: string[];
  evidence_chunks?: RawRagEvidenceWire[];
  evidenceChunks?: RawRagEvidenceWire[];
  retrieval_latency_ms?: number;
  retrievalLatencyMs?: number;
  synthesis_latency_ms?: number;
  synthesisLatencyMs?: number;
  total_latency_ms?: number;
  totalLatencyMs?: number;
  message?: string;
}
