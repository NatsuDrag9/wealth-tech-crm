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

