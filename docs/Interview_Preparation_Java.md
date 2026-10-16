# Interview Preparation Guide

This document captures project interview questions, authoritative answers, key code references from the WealthTech CRM codebase, and **critical architectural trade-offs** that senior interviewers frequently probe or push back on.

---

## Java Backend

### Table of Contents
1. [Security, Authentication & Authorization](#1-security-authentication--authorization)
2. [Asynchronous Processing, Concurrency & S3 Storage](#2-asynchronous-processing-concurrency--s3-storage)
3. [Database Design, Concurrency & Hibernate Optimizations](#3-database-design-concurrency--hibernate-optimizations)
4. [AI & RAG Architecture (pgvector, Embeddings & Quality Gates)](#4-ai--rag-architecture-pgvector-embeddings--quality-gates)
5. [Agentic AI, Domain Tools & Human-in-the-Loop](#5-agentic-ai-domain-tools--human-in-the-loop)
6. [Resilience, Rate Limiting vs. Timeouts & Model Cascading](#6-resilience-rate-limiting-vs-timeouts--model-cascading)
7. [Automated Evaluations, Benchmarks & Grounding Quality](#7-automated-evaluations-benchmarks--grounding-quality)
8. [Summary of High-Stakes Trade-Offs for Senior Interviews](#8-summary-of-high-stakes-trade-offs-for-senior-interviews)

---

### 1. Security, Authentication & Authorization

#### Question
> **How does your Spring Boot backend handle stateless authentication, token validation, and RBAC authorization across protected endpoints?**

#### Comprehensive Answer
1. **Stateless Security Filter Chain:** Configured in `SecurityConfig.java` with `SessionCreationPolicy.STATELESS`. CSRF is disabled because requests do not rely on ambient browser session cookies for state.
2. **Filter Interception (`OncePerRequestFilter`):** Every incoming request traverses `JwtAuthenticationFilter`. It extracts the Bearer token from the `Authorization` HTTP header.
3. **Token Verification:** `JwtTokenProvider` cryptographically verifies the token's HMAC-SHA256 signature and checks expiration.
4. **Context Population:** Upon successful validation, the user's email is extracted, `CustomUserDetailsService` loads the user and their granted authorities (roles and fine-grained permissions like `PORTFOLIO_REVIEW_CREATE`), and a `UsernamePasswordAuthenticationToken` is set into Spring's `SecurityContextHolder`.
5. **Method-Level RBAC:** Endpoints are guarded using `@PreAuthorize("hasAuthority('...')")`.
6. **Login Flow:** On `POST /api/v1/auth/login`, credentials are authenticated via Spring's `AuthenticationManager` using `BCryptPasswordEncoder`. The server issues a short-lived access token (15 mins) and sets a secure, `HttpOnly`, `SameSite=Strict` refresh token (7 days).

#### Code References
- `backend-java/src/main/java/com/wealthtech/crm/security/JwtAuthenticationFilter.java`
- `backend-java/src/main/java/com/wealthtech/crm/security/JwtTokenProvider.java`
- `backend-java/src/main/java/com/wealthtech/crm/security/SecurityConfig.java`

#### Notable Trade-offs & Potential Interviewer Pushback
- **Pushback: "If JWT is completely stateless, how do you revoke a user immediately if their permissions change or their token is compromised?"**
  - *Trade-off:* Pure stateless JWTs cannot be revoked without waiting for expiration unless a server-side token blacklist (e.g., Redis blocklist) is maintained.
  - *Defense:* We chose a **short 15-minute access token lifespan** combined with a revocable 7-day refresh token stored in an `HttpOnly` cookie. If an admin disables a user, the refresh token is revoked in the database, preventing renewal after the 15-minute window expires. If immediate revocation is required, a Redis blocklist or token versioning integer on the user entity can invalidate tokens instantaneously.
- **Pushback: "Querying the database in `UserDetailsService` on every single request defeats the performance benefit of stateless JWTs."**
  - *Trade-off:* Database hit on every request vs. trusting claims inside the JWT.
  - *Defense:* Embedding roles/permissions directly into the JWT payload avoids the DB lookup, but risks stale permissions during the token lifetime. For enterprise wealth management, we chose accuracy of user status over microsecond savings, but in higher-throughput production, authorities can be cached in Redis with a 5-minute TTL.

---

### 2. Asynchronous Processing, Concurrency & S3 Storage

#### Question
> **Generating investment proposal PDFs and re-evaluating large portfolios can be CPU and I/O intensive. How do you prevent these from blocking Tomcat HTTP request threads, and how does the client securely retrieve the generated file?**

#### Comprehensive Answer
1. **Thread Offloading:** We offload PDF rendering from Tomcat worker threads to Spring's `ThreadPoolTaskExecutor` using `@Async`. The API responds immediately with HTTP `202 Accepted` / `200 OK` containing a job tracking identifier.
2. **Explicit Status Lifecycle:** The proposal entity manages an explicit state machine:
   $$\text{PENDING} \longrightarrow \text{PROCESSING} \longrightarrow \text{COMPLETED} \quad (\text{or } \text{FAILED})$$
3. **Client Polling with Backoff:** The frontend polls the status endpoint using an exponential backoff strategy (polling every 2 seconds, decaying up to 10 seconds) rather than a rigid tight loop.
4. **Secure S3 Storage & Pre-signed URLs:** When completed, the PDF is written directly to AWS S3 (or LocalStack S3). The S3 bucket remains **completely private**. The client receives a time-bound **pre-signed URL** (valid for 15 minutes) generated via the AWS S3 SDK v2, allowing direct, secure browser download without routing massive file byte streams through the backend API.

#### Code References
- `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/service/PortfolioPdfGeneratorService.java`
- `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/service/PortfolioReviewService.java`
- `backend-java/src/main/java/com/wealthtech/crm/infrastructure/storage/S3StorageService.java`

#### Notable Trade-offs & Potential Interviewer Pushback
- **Pushback: "Why polling instead of WebSockets or Server-Sent Events (SSE)?"**
  - *Trade-off:* Polling introduces minor latency and repeated HTTP overhead vs. WebSockets requiring persistent connections and stateful load balancing.
  - *Defense:* WebSockets add significant infrastructure complexity: sticky sessions, connection state management across horizontally scaled instances, and load balancer idle timeouts. Because proposal generation takes only 2–5 seconds, short-lived polling with exponential backoff is simpler, resilient to disconnections, completely stateless, and scales horizontally without an external message broker.
- **Pushback: "What happens if the JVM crashes mid-generation while using `@Async`?"**
  - *Trade-off:* In-memory thread pools lack durable queue persistence.
  - *Defense:* An in-memory executor is lightweight for a single service instance. In an enterprise multi-node deployment, we would decouple this using a distributed queue (e.g., AWS SQS or RabbitMQ) and a transactional outbox pattern to guarantee at-least-once execution.

---

### 3. Database Design, Concurrency & Hibernate Optimizations

#### Question
> **How does your JPA / PostgreSQL layer handle concurrent modifications when multiple advisors review the same portfolio? And how do you avoid Hibernate's N+1 query problem?**

#### Comprehensive Answer
1. **Preventing Concurrent Overwrites (Lost Updates):**
   - While `@Transactional` guarantees atomicity and rollback on unchecked exceptions, standard `READ_COMMITTED` isolation does not prevent lost updates when two users read the same state and write back consecutively.
   - We prevent this using **Optimistic Locking**: the `PortfolioReview` entity contains a `@Version private Long version;` column. If Advisor B attempts to commit changes based on a stale version after Advisor A has already saved, Hibernate raises an `OptimisticLockingFailureException`, preventing silent data corruption.
2. **Eliminating the Hibernate N+1 Query Problem:**
   - Default lazy loading (`FetchType.LAZY`) executes 1 initial SQL query for the parent entity and $N$ additional queries when accessing related entities (e.g., loading $N$ client profiles or assigned RMs in a loop).
   - We eliminate this by writing JPQL queries with **`JOIN FETCH`** or applying Spring Data **`@EntityGraph`**, forcing Hibernate to emit a single consolidated SQL `LEFT OUTER JOIN` query that hydrates the required entity graph in one round trip.

#### Code References
- `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/model/PortfolioReview.java`
- `backend-java/src/main/java/com/wealthtech/crm/modules/customer/repository/ClientRepository.java`

#### Notable Trade-offs & Potential Interviewer Pushback
- **Pushback: "Why not use Pessimistic Locking (`SELECT FOR UPDATE`) instead of Optimistic Locking?"**
  - *Trade-off:* Pessimistic locks hold database row-level locks for the duration of the transaction, creating lock contention and potential deadlocks under high concurrency.
  - *Defense:* Portfolio reviews are primarily read-heavy advisory workflows where two advisors modifying the exact same client at the exact same second is rare. Optimistic locking avoids database lock contention and maximizes read throughput. The rare collision is caught safely and rejected back to the UI.
- **Pushback: "Using `JOIN FETCH` on multiple collections causes Cartesian product explosion."**
  - *Trade-off:* Joining multiple child collections in a single query duplicates parent rows exponentially.
  - *Defense:* We only use `JOIN FETCH` for `@ManyToOne` / `@OneToOne` associations (e.g., `Client` -> `ClientProfile` -> `User`). For collections, we fetch one collection via join fetch and batch-fetch secondary collections using `@BatchSize(size = 25)` to avoid Cartesian product multiplication.

---

### 4. AI & RAG Architecture (pgvector, Embeddings & Quality Gates)

#### Question
> **Walk me through the pipeline from an incoming RM question to the grounded final answer. How does hybrid retrieval work with `pgvector`, and how do you prevent hallucinations?**

#### Comprehensive Answer
1. **PII Sanitization Gateway:** Before any data leaves our boundary, incoming text passes through `PiiProtectionGateway`. It uses deterministic regex rules to redact sensitive personal identifiers (PAN numbers, Aadhaar, email addresses, phone numbers).
2. **Chunking & Indexing:** Fund factsheets and Scheme Information Documents (SIDs) are parsed and split into 500-token chunks with a 50-token overlap (`DocumentChunkingService`).
3. **Embeddings:** Chunks are vectorized using Google's `text-embedding-004` (768 dimensions).
4. **pgvector with HNSW:** Vectors are stored directly inside PostgreSQL using the `pgvector` extension with **HNSW (Hierarchical Navigable Small World)** indexing for sub-5ms cosine distance searches:
   $$\text{Cosine Similarity} = 1 - (\vec{u} \cdot \vec{v})$$
5. **Hybrid Filtering:** Rather than searching across all documents indiscriminately, retrieval is strictly scoped to the client's risk appetite band and the curated `eligible_funds` catalog.
6. **Post-Retrieval Evidence Quality Gate:** Retrieved chunks must pass a minimum similarity threshold (>= 0.75). If evidence is insufficient, synthesis is aborted, triggering query refinement or returning a deterministic fallback message rather than feeding weak context to the LLM.
7. **Strict Grounding:** Gemini Flash is instructed to synthesize answers citing evidence explicitly (e.g., `[Source 1: Parag Parikh Flexi Cap Factsheet]`).

#### Code References
- `backend-java/src/main/java/com/wealthtech/crm/infrastructure/ai/security/PiiProtectionGateway.java`
- `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/service/RagRetrievalService.java`
- `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/service/RagSynthesisService.java`
- `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/service/DocumentChunkingService.java`

#### Notable Trade-offs & Potential Interviewer Pushback
- **Pushback: "Why use PostgreSQL with `pgvector` instead of a dedicated vector database like Pinecone, Milvus, or Qdrant?"**
  - *Trade-off:* Dedicated vector DBs offer specialized vector clustering at massive billion-vector scale vs. `pgvector` unifying relational ACID data and vectors in one database engine.
  - *Defense:* In wealth management CRM, mutual fund universes consist of hundreds or thousands of schemes—not billions of documents. Using `pgvector` eliminates distributed consistency issues, avoids running a separate database cluster, enables single ACID transactions combining relational metadata with vector embeddings, and leverages existing backup/recovery infrastructure.
- **Pushback: "Why regex-based PII masking instead of an NER (Named Entity Recognition) model like spaCy or Presidio?"**
  - *Trade-off:* Regex is deterministic and ultra-fast (~1ms) but struggles with unstructured names; ML NER detects names in context but adds significant CPU latency and dependency overhead.
  - *Defense:* Financial identifiers in India (PAN cards: `[A-Z]{5}[0-9]{4}[A-Z]`, Aadhaar, phones) follow strict deterministic formats. Regex provides zero-latency, 100% predictable redaction without external model dependencies.

---

### 5. Agentic AI, Domain Tools & Human-in-the-Loop

#### Question
> **How does your AI Recommendation Agent work? Which tools are registered, and how did you design the Human-in-the-Loop (HITL) safeguard?**

#### Comprehensive Answer
1. **Strategy Resolution:** `AgentExecutionStrategyResolver` supports multiple execution strategies:
   - **`SpringAiAgentStrategy`:** Uses Spring AI `ChatClient` with function calling.
   - **`McpJavaAgentStrategy`:** Uses the Model Context Protocol (MCP) client-server pattern.
   - **`VanillaJavaAgentStrategy`:** Deterministic offline ReAct loop for testing and fallback.
2. **Domain Tool Registry (5 Core Tools):**
   - `getClientProfile`: Retrieves client KYC, tax status, and demographic info.
   - `getClientRiskAssessment`: Fetches risk score and allowable risk bands (e.g., AGGRESSIVE, CONSERVATIVE).
   - `getPortfolioReview`: Pulls current asset breakdown and holdings tagged as `SELL`.
   - `searchEligibleFunds`: Queries approved schemes matching risk criteria and asset allocation targets.
   - `stageDraftProposal`: Validates allocations against total investable capital and compliance rules, then stages the draft.
3. **Human-in-the-Loop (HITL) Architecture:**
   - In wealth management, autonomous live database execution is a severe compliance violation.
   - The agent outputs a **staged recommendation proposal** (`AgentExecutionResult`) with reasoning traces and allocation rationale.
   - Live portfolios are **never mutated directly**. The Relationship Manager reviews the draft in the UI, adjusts allocations if necessary, and explicitly confirms the proposal before generating client-facing documents.

#### Code References
- `backend-java/src/main/java/com/wealthtech/crm/modules/agent/strategy/AgentExecutionStrategyResolver.java`
- `backend-java/src/main/java/com/wealthtech/crm/modules/agent/tool/AgentToolRegistry.java`
- `backend-java/src/main/java/com/wealthtech/crm/modules/agent/strategy/impl/SpringAiAgentStrategy.java`
- `backend-java/src/main/java/com/wealthtech/crm/modules/agent/strategy/impl/McpJavaAgentStrategy.java`

#### Notable Trade-offs & Potential Interviewer Pushback
- **Pushback: "Why did you build Model Context Protocol (MCP) support alongside Spring AI? Isn't that redundant?"**
  - *Trade-off:* Maintaining two execution pathways increases codebase surface area.
  - *Defense:* It decouples the core domain tools from any specific AI framework. Spring AI function calling tightly couples tools to Spring's internal abstractions. By wrapping the same tools in an MCP server (`McpServer.java`), our domain tools become plug-and-play with external agents (Anthropic Claude, open-source MCP runners, or desktop tools) without rewriting business logic.
- **Pushback: "What prevents the agent from getting stuck in an infinite tool-calling loop?"**
  - *Trade-off:* Autonomy vs. execution limits.
  - *Defense:* We enforce a strict hard limit: `maxSteps = 5` and a timeout per tool invocation. If the agent does not converge on `stageDraftProposal` within 5 steps, execution halts, records an error in the step ledger, and returns a graceful partial fallback.

---

### 6. Resilience, Rate Limiting vs. Timeouts & Model Cascading

#### Question
> **What is the difference between transient load spikes/timeouts and hitting rate limits? How does your backend handle HTTP 429 quota exhaustion versus HTTP 503/timeouts?**

#### Comprehensive Answer

| Characteristic | **Transient Load Spikes / Timeouts (503 / 504 / Socket Timeouts)** | **Rate Limiting / Quota Exhaustion (429 Too Many Requests)** |
| :--- | :--- | :--- |
| **Root Cause** | Server-side overload, transient queue saturation, network packet loss. | Client policy violation (token bucket / RPM / TPM limit exceeded). |
| **System Behavior** | Server fails or takes too long to respond. | Server is healthy and deliberately rejects the request in <50ms. |
| **Retry Strategy** | **Exponential Backoff with Jitter:** Wait briefly and retry the *same* endpoint. | **Model Cascading:** Do *not* retry the same model immediately; switch models. |

1. **Handling 503 / Timeouts:**
   - Handled via retry policy with randomized exponential backoff:
     $$T_{\text{wait}} = \text{base} \times 2^{\text{attempt}} + \text{jitter}$$
   - Jitter prevents the "thundering herd" problem where multiple clients retry at the identical millisecond.
2. **Handling 429 Rate Limits & Quotas:**
   - Retrying the same model on 429 is counterproductive because the rate window has not reset.
   - `GeminiGenerationService` implements **Model Cascading**:
     $$\text{Primary Model (Gemini 2.0 Flash)} \xrightarrow{\text{HTTP 429}} \text{Secondary Model (Gemini 1.5 Pro / Flash)} \xrightarrow{\text{Failure}} \text{Offline Deterministic Rules Engine}$$
   - This ensures the RM's proposal generation workflow never fails completely due to single-model quota caps.

#### Code References
- `backend-java/src/main/java/com/wealthtech/crm/infrastructure/ai/GeminiGenerationService.java`
- `backend-java/src/test/java/com/wealthtech/crm/infrastructure/ai/GeminiGenerationServiceTest.java`

#### Notable Trade-offs & Potential Interviewer Pushback
- **Pushback: "Cascading to a secondary model (like Pro) might increase latency and inference cost significantly."**
  - *Trade-off:* High availability vs. cost predictability.
  - *Defense:* In wealth management, an RM sitting in front of a high-net-worth client experiencing an error screen is far more damaging than a marginal cost difference on a single API call. Additionally, we cascade to models of comparable tier or fall back to our deterministic rules engine if cost caps are strictly bounded.

---

### 7. Automated Evaluations, Benchmarks & Grounding Quality

#### Question
> **How do you objectively evaluate your RAG pipeline? What metrics do you benchmark against your Golden Dataset?**

#### Comprehensive Answer
We separated evaluation into two distinct dimensions: **Information Retrieval (IR) Quality** and **Generation Quality**, tested via automated JUnit suites (`RagRetrievalBenchmarkTest` and `RagGenerationBenchmarkTest`).

1. **The Curated Golden Dataset:**
   - 5 representative mutual fund reference pairs across categories (Large Cap, Flexi Cap, ELSS, Mid Cap) with ground-truth factsheet numbers (expense ratios, 3Y returns, fund managers, AUM).
2. **Retrieval Quality Metrics (IR Gates):**
   - **Recall@K (>= 0.80):** Measures the proportion of relevant ground-truth factsheet chunks captured in the top-$K$ search results.
   - **Hit Rate (>= 0.85):** Percentage of test queries where at least one ground-truth document was present in the retrieved window.
   - **MRR (Mean Reciprocal Rank >= 0.75):** Measures where the first relevant document appears:
     $$\text{MRR} = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i}$$
     Ensures the primary fund factsheet is positioned at rank 1 or 2, placing it at the top of the LLM prompt.
3. **Generation & Grounding Quality Metrics:**
   - **Faithfulness / Fact-Checking (>= 0.90):** Checks that all numerical and factual statements in the generated response are directly supported by the retrieved context chunks, penalizing fabricated returns or ratios.
   - **Answer Relevancy:** Measures cosine similarity between the RM query intent and the generated recommendation summary.

#### Code References
- `backend-java/src/test/java/com/wealthtech/crm/modules/portfolioreview/eval/RagRetrievalBenchmarkTest.java`
- `backend-java/src/test/java/com/wealthtech/crm/modules/portfolioreview/eval/RagGenerationBenchmarkTest.java`
- `backend-java/src/test/java/com/wealthtech/crm/modules/portfolioreview/eval/metrics/RetrievalMetricsCalculator.java`
- `backend-java/src/test/java/com/wealthtech/crm/modules/portfolioreview/eval/evaluator/FactCheckingEvaluator.java`

#### Notable Trade-offs & Potential Interviewer Pushback
- **Pushback: "Using an LLM to evaluate an LLM (LLM-as-a-Judge) can be biased or noisy."**
  - *Trade-off:* Deterministic string matching is too rigid for natural language, while LLM-as-a-Judge has slight stochasticity.
  - *Defense:* For factual numbers (e.g., TER: 0.65%, 3Y Return: 18.2%), we use deterministic regex and entity extraction to verify numbers against the source table. We reserve LLM-as-a-judge solely for linguistic faithfulness and semantic relevancy scoring, setting temperature to 0.0 for deterministic evaluation.

---

### 8. Summary of High-Stakes Trade-Offs for Senior Interviews

| Architecture Decision | What We Chose | Alternative Considered | Primary Justification & Trade-Off |
| :--- | :--- | :--- | :--- |
| **Vector Storage** | **PostgreSQL + `pgvector`** | Pinecone / Milvus / Qdrant | Keeps ACID relational data and vector embeddings in a single database; eliminates multi-database sync overhead for our scheme catalog size. |
| **Locking Strategy** | **Optimistic Locking (`@Version`)** | Pessimistic Locking (`FOR UPDATE`) | Optimizes for read-heavy advisory workflows; eliminates DB row lock contention while safely catching rare concurrent collisions. |
| **Query Optimization** | **`JOIN FETCH` & `@EntityGraph`** | Lazy Loading or Eager Joins | Prevents N+1 query explosions in client-profile-role hierarchies in a single SQL round-trip. |
| **Async Processing** | **`@Async` + Client Polling** | WebSockets / SSE | Keeps backend stateless across horizontal replicas; avoids maintaining persistent open socket connections for 2-5 second jobs. |
| **Agent Autonomy** | **Human-in-the-Loop Staging** | Full Autonomous Execution | In fiduciary wealth management, autonomous portfolio mutation is a regulatory violation. Staging proposals keeps the RM legally liable and in control. |
| **PII Redaction** | **Deterministic Regex Gateway** | Heavy ML / NER Models | Near-zero latency (~1ms), zero external dependencies, 100% predictable redaction for standardized financial formats (PAN, Aadhaar, phones). |
| **LLM Resilience** | **Model Cascading on 429** | Blind Retries | Prevents wasted round-trips to rate-limited models; immediately cascades to secondary models or offline fallback engines. |



