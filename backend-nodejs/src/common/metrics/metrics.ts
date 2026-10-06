import client from 'prom-client';

export const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: 'nodejs_',
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 1.5, 2, 5],
  registers: [register],
});

export const ragRetrievalDurationSeconds = new client.Histogram({
  name: 'rag_retrieval_duration_seconds',
  help: 'Latency of RAG vector + keyword hybrid search in seconds',
  labelNames: ['index_name', 'filter_category'] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

export const ragSimilarityScore = new client.Histogram({
  name: 'rag_similarity_score',
  help: 'Cosine similarity scores of retrieved document chunks',
  labelNames: ['index_name'] as const,
  buckets: [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0],
  registers: [register],
});

export const llmTokensTotal = new client.Counter({
  name: 'llm_tokens_total',
  help: 'Total LLM tokens consumed',
  labelNames: ['model', 'token_type', 'agent_name'] as const,
  registers: [register],
});

export const agentToolCallsTotal = new client.Counter({
  name: 'agent_tool_calls_total',
  help: 'Total tool calls invoked by agents',
  labelNames: ['agent_name', 'tool_name', 'status'] as const,
  registers: [register],
});

export const agentExecutionIterations = new client.Histogram({
  name: 'agent_execution_iterations',
  help: 'Number of reasoning-action loop iterations per agent goal',
  labelNames: ['agent_name'] as const,
  buckets: [1, 2, 3, 4, 5, 6, 8, 10],
  registers: [register],
});

export const s3OperationDurationSeconds = new client.Histogram({
  name: 's3_operation_duration_seconds',
  help: 'Latency of AWS S3 and LocalStack operations in seconds',
  labelNames: ['operation', 'bucket'] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

export const s3OperationFailuresTotal = new client.Counter({
  name: 's3_operation_failures_total',
  help: 'Total failed S3 operations',
  labelNames: ['operation', 'bucket'] as const,
  registers: [register],
});

export const piiRedactedTokensTotal = new client.Counter({
  name: 'pii_redacted_tokens_total',
  help: 'Total number of PII tokens sanitized and redacted',
  labelNames: ['entity_type'] as const,
  registers: [register],
});

export const piiTokenizationDurationSeconds = new client.Histogram({
  name: 'pii_tokenization_duration_seconds',
  help: 'Duration of PII tokenization operations in seconds',
  labelNames: ['status'] as const,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25],
  registers: [register],
});

export const ragEmbeddingDurationSeconds = new client.Histogram({
  name: 'rag_embedding_latency_seconds',
  help: 'Latency of Gemini embedding API calls in seconds',
  labelNames: ['status'] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

export const ragEmbeddingCallsTotal = new client.Counter({
  name: 'rag_embedding_calls_total',
  help: 'Total Gemini embedding API calls',
  labelNames: ['status'] as const,
  registers: [register],
});

export const ragSynthesisDurationSeconds = new client.Histogram({
  name: 'rag_synthesis_duration_seconds',
  help: 'Latency of RAG grounded synthesis in seconds',
  labelNames: ['status'] as const,
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30],
  registers: [register],
});

export const ragSynthesisTotal = new client.Counter({
  name: 'rag_synthesis_total',
  help: 'Total grounded RAG query syntheses',
  labelNames: ['grounded'] as const,
  registers: [register],
});

export const ragGenerationCallsTotal = new client.Counter({
  name: 'rag_generation_calls_total',
  help: 'Total Gemini generation API calls',
  labelNames: ['status'] as const,
  registers: [register],
});

// ==========================================
// RAG Evaluation & Benchmark Telemetry Metrics
// ==========================================
export const ragEvalFaithfulnessScore = new client.Gauge({
  name: 'rag_eval_faithfulness_score',
  help: 'Latest grounded faithfulness evaluation score (0.0 - 1.0) assessing factual accuracy against context',
  registers: [register],
});

export const ragEvalRelevancyScore = new client.Gauge({
  name: 'rag_eval_relevancy_score',
  help: 'Latest answer relevancy evaluation score (0.0 - 1.0) assessing semantic alignment to user query',
  registers: [register],
});

export const ragEvalIrRecall = new client.Gauge({
  name: 'rag_eval_ir_recall',
  help: 'Latest IR Candidate-Grounded Recall@K metric across benchmark evaluation',
  labelNames: ['k'] as const,
  registers: [register],
});

export const ragEvalIrNdcg = new client.Gauge({
  name: 'rag_eval_ir_ndcg',
  help: 'Latest IR Normalized Discounted Cumulative Gain (NDCG@K) metric across benchmark evaluation',
  labelNames: ['k'] as const,
  registers: [register],
});

export const ragEvalIrMrr = new client.Gauge({
  name: 'rag_eval_ir_mrr',
  help: 'Latest IR Mean Reciprocal Rank (MRR) metric across benchmark evaluation',
  registers: [register],
});

export const ragEvalRunsTotal = new client.Counter({
  name: 'rag_eval_runs_total',
  help: 'Total number of RAG evaluation runs',
  labelNames: ['evaluator', 'judge_type', 'verdict'] as const,
  registers: [register],
});

export const ragEvalDurationSeconds = new client.Histogram({
  name: 'rag_eval_duration_seconds',
  help: 'Latency of RAG evaluation execution in seconds',
  labelNames: ['evaluator'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});



