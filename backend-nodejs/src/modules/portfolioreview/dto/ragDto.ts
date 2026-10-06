export interface RetrievedEvidenceChunkDto {
  id: string;
  isin: string;
  fundName: string;
  documentType: string;
  scoreCategory: string;
  assetClass?: string;
  chunkIndex: number;
  chunkText: string;
  metadata?: string;
  similarityScore: number;
  createdAt?: string;
}

export interface RagRetrievalRequestDto {
  query: string;
  clientId?: string;
  candidateIsins?: string[];
  scoreCategory?: string;
  topK?: number;
  similarityThreshold?: number;
}

export interface RagRetrievalResponseDto {
  query: string;
  isSufficient: boolean;
  ragSimilarityScore: number;
  evidenceConsistencyScore: number;
  candidateIsins: string[];
  evidenceChunks: RetrievedEvidenceChunkDto[];
  retrievalLatencyMs: number;
  message: string;
}

export interface RagQueryRequestDto {
  query: string;
  conversationId?: string;
  clientId?: string;
  candidateIsins?: string[];
  topK?: number;
  similarityThreshold?: number;
  temperature?: number;
}

export interface RagQueryResponseDto {
  query: string;
  conversationId: string;
  turnIndex: number;
  answer: string;
  isGrounded: boolean;
  queryWasRefined: boolean;
  ragSimilarityScore: number;
  citations: string[];
  evidenceChunks: RetrievedEvidenceChunkDto[];
  retrievalLatencyMs: number;
  synthesisLatencyMs: number;
  totalLatencyMs: number;
  groundingStatus: string;
}

export interface IngestionSummaryDto {
  documentsProcessed: number;
  chunksCreated: number;
  embeddingsGenerated: number;
  failedDocuments: number;
  elapsedMs: number;
  status: string;
}
