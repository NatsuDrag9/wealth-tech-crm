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
9. [Architectural and Implementation Defense](#9-architectural-and-implementation-defense)
   - [9.1 RAG Deepdive (Stages 1 to 6)](#91-rag-deepdive-stages-1-to-6)
     - [Stage 1: Document Ingestion & Boundary-Aware Chunking](#stage-1-document-ingestion--boundary-aware-chunking)
     - [Stage 2: Dense Embeddings & Idempotent Vector Storage (PostgreSQL pgvector)](#stage-2-dense-embeddings--idempotent-vector-storage-postgresql-pgvector)
     - [Stage 3: Candidate-Constrained Hybrid Retrieval (pgvector + GIN Full-Text)](#stage-3-candidate-constrained-hybrid-retrieval-pgvector--gin-full-text)
     - [Stage 4: Query Refinement Loop & Defensive Degradation](#stage-4-query-refinement-loop--defensive-degradation)
     - [Stage 5: Bidirectional PII Sanitization Gateway](#stage-5-bidirectional-pii-sanitization-gateway)
     - [Stage 6: Resilient Model Cascading & Circuit Breaking](#stage-6-resilient-model-cascading--circuit-breaking)
   - [9.2 Agentic AI Architecture & Tooling Framework](#92-agentic-ai-architecture--tooling-framework)
     - [9.2.1 Agent Execution Strategy Resolver, Spring AI & MCP SDK](#921-agent-execution-strategy-resolver-spring-ai--mcp-sdk)
     - [9.2.2 The 5 Core Advisory Tools & Schema Validation](#922-the-5-core-advisory-tools--schema-validation)
   - [9.3 Core Backend](#93-core-backend)
     - [9.3.1 Security, Authentication & JWT Lifecycle](#931-security-authentication--jwt-lifecycle)
     - [9.3.2 Fine-Grained RBAC & Method Security](#932-fine-grained-rbac--method-security)
     - [9.3.3 PostgreSQL Schema Design, pgvector HNSW & Hibernate Optimizations](#933-postgresql-schema-design-pgvector-hnsw--hibernate-optimizations)
     - [9.3.4 Asynchronous eCAS Processing (@Async) & SEBI Advisory Gates](#934-asynchronous-ecas-processing-async--sebi-advisory-gates)

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

---

### 9. Architectural and Implementation Defense

This section uses the **6 W's Senior Architectural Defense Framework** across every component of our Spring Boot and PostgreSQL backend:
1. **What was built?** (Concrete engineering implementation)
2. **Why this?** (Architectural choices, production trade-offs, and why alternatives were rejected)
3. **How was it checked?** (Empirical validation, Golden Dataset benchmarks, and integration verification)
4. **What unit tests?** (JUnit 5 test cases and pseudo-code testing specific edge cases)
5. **Where are logs & metrics?** (SLF4J/Logback audit events and Micrometer/Prometheus telemetry)
6. **What if it breaks?** (Failure modes, circuit breakers, and defensive recovery)

---

#### 9.1 RAG Deepdive (Stages 1 to 6)

##### Stage 1: Document Ingestion & Boundary-Aware Chunking

*Code References:*
- **PDF Parser Service:** `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/service/PdfDocumentParserService.java`
- **Document Chunking Service:** `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/service/DocumentChunkingService.java`
- **Fund Ingestion Service:** `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/service/FundDocumentIngestionService.java`
- **Unit Test Suite:** `backend-java/src/test/java/com/wealthtech/crm/modules/portfolioreview/service/DocumentChunkingServiceTest.java`

###### 1. What was built?
1. **In-Memory Buffer Stream Parsing (`PdfDocumentParserService`):**
   - Parses native PDF object streams page-by-page directly from memory byte streams (`byte[]` / `InputStream`) using PDF stream tokenizers without persisting temporary files to disk.
2. **Boundary-Aware Hierarchical Chunking Engine (`DocumentChunkingService`):**
   - Implements a 3-tier hierarchical fallback directly in JVM CPU memory:
     - **Tier 1 (Page Fast-Path):** Factsheet disclosure pages containing $\le 1200$ characters bypass sub-chunking entirely and are preserved as single, contiguous chunks.
     - **Tier 2 (Paragraph Aggregation):** For larger pages, it segments text by double line breaks (`\n\s*\n`) and accumulates paragraphs into a **`1200 character` target window** (~250–300 words). This ensures related tabular rows, disclaimers, and comma-separated lists of holdings stay grouped together in the same chunk.
     - **Tier 3 (Sentence Fallback):** Only when an individual paragraph exceeds the 1200-character ceiling does it fall back to splitting by sentence terminals via lookbehind regex (`/(?<=[.!?])\s+/`). It deliberately avoids splitting on commas (`,`) so financial figures, decimal percentages (e.g. `0.72%`), and comma-separated lists are never fragmented.
     - **Contextual Continuity Overlap:** Retains a **`200 character` sliding overlap window** (~35–40 words) from the previous chunk's tail to ensure concepts straddling chunk boundaries are not severed.
3. **Structured Metadata Enrichment:**
   - Enriches every chunk with a serialized JSON metadata string containing `isin`, `schemeName`, `sourceFile`, `pageNumber`, and `chunkIndex`.

###### 2. Why this? (Choices & Trade-offs)
- **Why in our Financial Context:**
  - Mutual fund factsheets and Scheme Information Documents (SIDs) are dense with financial tables, benchmark returns, and fee metrics (e.g., `Direct Plan TER: 0.72%`, `1Y CAGR: 18.4%`).
  - Naive fixed-character slicing (e.g. cutting strictly every 500 characters) bisects critical numbers across chunk boundaries (`"0."` in chunk 1 and `"72%"` in chunk 2), destroying mathematical coherence.
  - Boundary-aware splitting ensures whole sentences and tabular rows stay intact. The 200-character overlap guarantees that context leading into or out of a table is never severed.
- **Why Not Semantic Chunking? (Direct Factsheet vs. Factsheet Comparison):**
  - *Network & Cost Overhead:* On a single 3-page factsheet (~200 lines), semantic chunking requires generating an embedding for **all 200 individual lines across the network** just to calculate cosine distance drops between sentences, burning 200+ API calls and risking HTTP 429 quota exhaustion. Boundary-aware chunking runs in-process in Java using CPU string operations ($< 5\text{ ms}$) and makes only **10–12 total API calls** for the final chunks.
  - *Table Fragmentation Flaw:* Factsheets pack completely different metrics side-by-side (`HDFC Bank: 8.2%` followed by `TER: 0.72%` followed by `Turnover: 24.5%`). A semantic distance algorithm perceives a topic shift on almost every line, fracturing tables into isolated 1-line orphan chunks (e.g. `TER: 0.72%` stripped of its fund name and AUM context). Boundary-aware chunking preserves the fund header, tables, and notes together in a cohesive 1200-character window.
- **Why Not Page-Level Chunking?**
  - Embedding an entire page (3,000+ characters) dilutes semantic density. A specific query like *"exit load after 365 days"* gets drowned out by the other 800 words on the page during vector similarity search.

###### 3. How was it checked?
* **Manual Inspection (During Local Dev):** Tested with real SEBI mutual fund factsheets to visually verify the 3-tier hierarchy: small disclosure pages were preserved whole, multi-paragraph pages split on natural paragraph/sentence boundaries (`\n\n`, `[.!?]`) without cutting mid-word, and comma-separated holdings/NAV tables remained completely intact in their original chunks.
* **Automated Unit Tests (JUnit 5):** Fully verified in `DocumentChunkingServiceTest.java` covering small-page fast path, boundary-aware splitting, sliding overlap, and empty document handling.

###### 4. What unit tests? (JUnit 5 Pseudo-code)
* **Test Case 1: Small Page Fast-Path (Single Chunk Preservation)**
  ```java
  @Test
  void shouldPreserveSmallPageAsSingleChunk() {
      DocumentPage page = new DocumentPage(1, "Short disclosure statement under 1200 chars.");
      List<DocumentChunk> chunks = chunkingService.chunkDocumentPages(List.of(page), "fund.pdf", "INF123", "Parag Parikh Flexi Cap");
      assertEquals(1, chunks.size());
      assertEquals(page.getContent(), chunks.get(0).getContent());
  }
  ```
* **Test Case 2: Boundary-Aware Splitting & Sliding Overlap**
  ```java
  @Test
  void shouldSplitOnSentenceBoundariesWithOverlap() {
      String longText = generateFinancialText(2500); // 2500 chars
      DocumentPage page = new DocumentPage(1, longText);
      List<DocumentChunk> chunks = chunkingService.chunkDocumentPages(List.of(page), "fund.pdf", "INF123", "Parag Parikh Flexi Cap");
      assertTrue(chunks.size() > 1);
      assertTrue(chunks.get(0).getContent().endsWith("."));
      assertTrue(chunks.get(1).getContent().startsWith(chunks.get(0).getContent().substring(chunks.get(0).getContent().length() - 50)));
  }
  ```
* **Test Case 3: Comma-Separated Financial Lists Preserved Intact**
  ```java
  @Test
  void shouldNotSplitOnCommasInFinancialTables() {
      String portfolioLine = "Holdings: HDFC Bank (8.45%), ICICI Bank (7.12%), Infosys (6.34%), TCS (4.21%)";
      DocumentPage page = new DocumentPage(1, portfolioLine);
      List<DocumentChunk> chunks = chunkingService.chunkDocumentPages(List.of(page), "fund.pdf", "INF123", "Parag Parikh Flexi Cap");
      assertEquals(1, chunks.size());
      assertTrue(chunks.get(0).getContent().contains("ICICI Bank (7.12%)"));
  }
  ```

###### 5. Where are logs & metrics?
* **SLF4J / Logback Logs:**
  - `log.info("Chunked document {} (ISIN: {}) into {} total chunks across {} pages", fileName, isin, chunks.size(), pages.size())`
  - `log.warn("Document page {} had empty or whitespace-only content; skipping", pageNumber)`
* **Micrometer / Prometheus Metrics:**
  - `chunking_duration_seconds` *(Timer)*: Tracks the latency of in-memory chunking operations.
  - `document_chunks_total` *(Counter)*: Total number of discrete chunks generated for vectorization.

###### 6. What if it breaks? (Edge cases)
1. **Corrupt or Encrypted PDF Upload:**
   - *What happens:* `PdfDocumentParserService` encounters a malformed byte stream or password-locked PDF.
   - *How it is handled:* Catches `IOException`, logs `log.error("Failed to parse PDF stream: corrupt or encrypted", e)`, and throws a clean `BadRequestException("The uploaded mutual fund document could not be processed: invalid PDF format")` with zero server crashes.
2. **Gigantic Single Paragraph Without Periods:**
   - *What happens:* A poorly OCR'd factsheet table contains 4,000 characters with no periods or paragraph breaks.
   - *How it is handled:* Falls back to a deterministic character boundary window to enforce the hard 1200-character ceiling, preventing JVM OutOfMemoryErrors or embedding API payload rejections.

---

##### Stage 2: Dense Embeddings & Idempotent Vector Storage (PostgreSQL pgvector)

*Code References:*
- **Embedding Generation Service:** `backend-java/src/main/java/com/wealthtech/crm/infrastructure/ai/GeminiEmbeddingService.java`
- **Embedding Entity:** `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/entity/FundDocumentEmbedding.java`
- **Embedding Repository:** `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/repository/FundDocumentEmbeddingRepository.java`
- **Ingestion Service:** `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/service/FundDocumentIngestionService.java`

###### 1. What was built?
1. **Google Gemini `text-embedding-004` Integration:**
   - Vectorizes text chunks into 768-dimensional dense float vectors via `GeminiEmbeddingService` with exponential backoff and randomized jitter.
2. **Unified PostgreSQL Storage with `pgvector`:**
   - Chunks are stored in the `fund_document_embeddings` table with a native `vector(768)` column mapped via Hibernate's `@JdbcTypeCode(SqlTypes.VECTOR)` (`private float[] embedding;`).
   - Indexed via **HNSW (Hierarchical Navigable Small World)** with `vector_cosine_ops` for sub-5ms nearest-neighbor queries:
     ```sql
     CREATE INDEX idx_fund_embeddings_hnsw ON fund_document_embeddings 
     USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
     ```
3. **Atomic Idempotent Ingestion (`@Transactional`):**
   - When a revised monthly factsheet is ingested for an existing ISIN, `FundDocumentIngestionService` runs inside a single database transaction:
     ```java
     embeddingRepository.deleteByIsinAndDocumentType(isin, documentType);
     embeddingRepository.saveAll(newEmbeddings);
     ```
   - Prevents duplicate chunks from proliferating across ingestion cycles.

###### 2. Why this? (Choices & Trade-offs)
- **Why PostgreSQL with `pgvector` Instead of a Dedicated Vector DB (Pinecone, Milvus, Qdrant)?**
  - *Unified ACID Consistency:* In wealth management, mutual fund scheme catalogs consist of hundreds or thousands of schemes—not billions of vectors. Storing vectors directly in PostgreSQL allows us to join relational metadata (`EligibleFund`, `RiskAssessment`, `ClientProfile`) and vector embeddings in a single atomic SQL transaction.
  - *Zero Split-Brain / Distributed Sync Overhead:* A separate vector DB introduces network round-trips, distributed consistency synchronization bugs (e.g. fund deleted in SQL but still recommended by Pinecone), and extra SaaS subscription costs ($100–$500/month).
- **Why HNSW Over IVFFlat?**
  - *Zero Training Requirement:* IVFFlat requires an initial `CREATE INDEX` with clustering lists that must be retrained as data changes. HNSW is a graph-based index that supports dynamic inserts without index degradation and maintains higher recall ($\ge 98\%$) under concurrent queries.

###### 3. How was it checked?
* **Automated JUnit 5 Suites (`GeminiEmbeddingServiceTest.java`, `FundDocumentIngestionServiceTest.java`):**
  - Verified that `getEmbedding()` returns an array of length 768.
  - Verified that re-ingesting the same ISIN replaces existing chunks cleanly without primary key or unique constraint violations.

###### 4. What unit tests? (JUnit 5 Pseudo-code)
* **Test Case 1: 768-Dimension Dense Vector Verification**
  ```java
  @Test
  void shouldReturn768DimensionalEmbedding() {
      float[] vector = embeddingService.getEmbedding("Parag Parikh Flexi Cap Fund Factsheet");
      assertNotNull(vector);
      assertEquals(768, vector.length);
  }
  ```
* **Test Case 2: Idempotent Re-Ingestion (Delete-Before-Insert)**
  ```java
  @Test
  void shouldAtomicallyReplaceExistingChunksForIsin() {
      ingestionService.ingestDocument(mockPdf, "INF123", DocumentType.FACTSHEET);
      long countFirst = embeddingRepository.countByIsin("INF123");
      
      // Ingest updated document for same ISIN
      ingestionService.ingestDocument(mockPdfUpdated, "INF123", DocumentType.FACTSHEET);
      long countSecond = embeddingRepository.countByIsin("INF123");
      
      assertEquals(countFirst, countSecond); // No duplicate chunk bloat
  }
  ```

###### 5. Where are logs & metrics?
* **SLF4J Logs:**
  - `log.info("Persisted {} vector embeddings for ISIN: {} ({})", chunks.size(), isin, documentType)`
  - `log.error("Failed to generate embedding from Gemini API for chunk index {}", chunkIndex, e)`
* **Micrometer Metrics:**
  - `gemini_embedding_duration_seconds` *(Timer)*: Tracks latency of Google Gemini embedding calls.
  - `embedding_insertion_total` *(Counter)*: Tracks total embeddings saved to PostgreSQL.

###### 6. What if it breaks? (Edge cases)
1. **Google Embedding Quota Exhaustion (HTTP 429):**
   - *What happens:* Batch ingestion of a 50-page document hits Gemini requests-per-minute limits.
   - *How it is handled:* Handled with exponential backoff and randomized jitter (initial 1000ms delay, multiplier 2.0, max 3 attempts) configured in `ResilienceProperties`.
2. **Database Connection Interruption Mid-Ingestion:**
   - *What happens:* Network blip during `saveAll()`.
   - *How it is handled:* Wrapped in `@Transactional`. The `deleteByIsinAndDocumentType` and partial `saveAll` are completely rolled back, leaving the previous verified factsheet intact.

---

##### Stage 3: Candidate-Constrained Hybrid Retrieval (pgvector + GIN Full-Text)

*Code References:*
- **RAG Retrieval Service:** `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/service/RagRetrievalService.java`
- **Embedding Repository:** `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/repository/FundDocumentEmbeddingRepository.java`
- **Eligible Fund Repository:** `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/repository/EligibleFundRepository.java`
- **Benchmark Test:** `backend-java/src/test/java/com/wealthtech/crm/modules/portfolioreview/eval/RagRetrievalBenchmarkTest.java`

###### 1. What was built?
1. **Hard Relational Pre-Filtering (`resolveCandidateIsins`):**
   - Before executing vector distance math, the service inspects the client's completed `RiskAssessment` and resolves candidate ISINs matching the client's SEBI risk category (`CONSERVATIVE`, `MODERATE`, `AGGRESSIVE`) from `EligibleFund`.
2. **PostgreSQL Tri-Factor Hybrid SQL Query:**
   - Executes candidate pre-filtering, dense vector cosine similarity, and full-text keyword ranking in a **single consolidated SQL query**:
     ```sql
     SELECT 
         f.id AS id, f.isin AS isin, f.fund_name AS fundName,
         f.document_type AS documentType, f.chunk_text AS chunkText,
         (
             0.7 * (1.0 - (f.embedding <=> CAST(:queryEmbedding AS vector))) +
             0.3 * ts_rank_cd(to_tsvector('english', f.chunk_text), plainto_tsquery('english', :queryText))
         ) AS hybridScore
     FROM fund_document_embeddings f
     WHERE f.isin IN (:candidateIsins)
     ORDER BY hybridScore DESC
     LIMIT :limit
     ```
3. **Top-K Window Selection (`topK = 5`):**
   - Retrieves the top 5 chunks into `evidenceChunks` to provide comprehensive context for prompt generation (`[Source 1]` to `[Source 5]`).
4. **Evidence Quality Gate via Peak Score (`maxScore`):**
   - Evaluates whether the single highest scoring chunk meets the minimum similarity threshold of **`0.65`** (`maxScore >= 0.65`). If below 0.65, flags `isSufficient = false`.

###### 2. Why this? (Choices & Trade-offs)
- **Why Does Retrieval Return Top-K Chunks But the Quality Gate Evaluates Peak Score (`maxScore`)?**
  - *Why return Top-K chunks (Top 5) instead of only the single #1 chunk?*
    - Complex financial questions require multi-angle factual context that rarely fits in a single chunk (e.g. fund mandate chunk + asset allocation chunk + TER fee table chunk + exit load note chunk). Returning the top-5 window supplies `RagSynthesisService` with complete multi-chunk evidence for source citations (`[Source 1..5]`).
  - *Why evaluate peak score (`maxScore`) instead of the average score across all top-K chunks?*
    - **Avoiding Score Dilution from Secondary Chunks:** In mutual fund disclosures, a specific metric (e.g., TER of 0.76% or exit load terms) is concentrated in **one exact chunk** (scoring e.g. `0.88`), while supporting background chunks naturally score lower (e.g. `0.52`). Averaging them `(0.88 + 0.58 + 0.54 + 0.51 + 0.49) / 5 = 0.60` would fall below 0.65 and falsely reject valid evidence.
    - **The Factual Bullseye Guarantee:** Checking `maxScore >= 0.65` guarantees that **at least one retrieved chunk hit the factual bullseye**. If the single best chunk in the entire top-K window cannot even reach 0.65, it is mathematically certain that all lower-ranked chunks are even weaker noise.
- **Why Hybrid Search (70% Vector + 30% Keyword) Instead of Pure Vector Search?**
  - Pure vector search understands concepts (e.g. *"low cost"* matching *"TER"*), but is weak at exact names and numbers. In finance, it can accidentally rank the wrong fund's factsheet (like pulling SBI Large Cap when the user asked for HDFC Large Cap because both describe large caps similarly).
  - Adding the 30% keyword score gives an immediate boost to chunks that contain the exact fund name and ticker, ensuring the right fund always wins the top spot.
- **How Does the App Decide Between Semantic and Keyword Search for Questions Like "Find the TER of Parag Parikh"? Is Semantic Search Triggered for All Questions Even When it Seems Expensive or Unnecessary?**
  - *Both Run Together by Default (No Query Routing):* The backend does **not** try to classify queries or decide whether to use keyword or vector search. Every search automatically runs both (70% vector + 30% keyword) at the same time in the same SQL query.
  - *Why Not Skip Semantic Search for Specific Questions Like "Find the TER of Parag Parikh"?*
    - **The Everyday Language Gap:** An advisor might type *"What is the **cost** of Parag Parikh fund?"* or *"What are the **annual charges**?"*. Mutual fund regulatory factsheets never use the word *"cost"*—they only write *"Total Expense Ratio"* or *"TER"*. A pure keyword search looking for *"cost"* would return **zero results** and fail completely! Semantic vector search is necessary because it understands that *"cost"* means the same thing as *"TER"*.
    - **Preventing Fund Name Confusion:** At the same time, pure vector search alone can confuse similar mutual funds (like Parag Parikh Flexi Cap vs. HDFC Flexi Cap) because both have similar flexi-cap descriptions. The 30% keyword score ensures that any chunk with the exact name *"Parag Parikh"* gets an immediate boost and wins the top spot.
  - *Why Semantic Search is NOT Computationally Expensive in Our Architecture:*
    - **Search Pool is Already Tiny (20–50 Chunks):** We pre-filter funds by the client's SEBI risk category *before* searching. We never search across thousands of documents—only 20 to 50 chunks for approved funds.
    - **Runs in Under 1 Millisecond in PostgreSQL:** Executing the HNSW vector distance calculation for 30 candidate chunks takes $< 1\text{ ms}$ in PostgreSQL.
    - **Only 1 Network API Call:** We only call Google's `text-embedding-004` once to convert the user's question into a vector (~150 ms). All document chunks were already converted and saved in PostgreSQL offline during upload.

###### 3. How was it checked?
* **Golden Dataset Benchmark (`RagRetrievalBenchmarkTest.java`):** Tested retrieval accuracy against a Golden Dataset of real mutual fund questions. Verified that our tri-factor hybrid scoring consistently passes quality gates: **Recall@5 $\ge 80\%$** (`hitRate >= 0.80`) and **MRR $\ge 0.75$**.
* **Automated Unit Tests (JUnit 5):** Covered in `RagRetrievalServiceTest.java`.

###### 4. What unit tests? (JUnit 5 Pseudo-code)
* **Test Case 1: Candidate Risk Category Pre-Filtering**
  ```java
  @Test
  void shouldFilterCandidatesStrictlyByClientRiskProfile() {
      RagRetrievalRequest request = new RagRetrievalRequest("Find best growth funds", 101L, null, null, 5, 0.65);
      RagRetrievalResponse response = retrievalService.retrieveEvidence(request);
      assertTrue(response.isSufficient());
      assertTrue(response.candidateIsins().stream().allMatch(isin -> isConservativeFund(isin)));
  }
  ```
* **Test Case 2: Zero Eligible Funds Fallback**
  ```java
  @Test
  void shouldReturnInsufficientWhenZeroCandidateFundsFound() {
      RagRetrievalRequest request = new RagRetrievalRequest("Query for unregistered client", 9999L, null, null, 5, 0.65);
      RagRetrievalResponse response = retrievalService.retrieveEvidence(request);
      assertFalse(response.isSufficient());
      assertEquals(0.0, response.ragSimilarityScore());
      assertEquals(0, response.evidenceChunks().size());
  }
  ```

###### 5. Where are logs & metrics?
* **SLF4J Logs:**
  - `log.warn("Candidate ISIN filter produced zero eligible funds for request query: {}", request.query())`
  - `log.warn("Evidence quality gate failed: max hybrid score {} below threshold {}", maxScore, threshold)`
* **Micrometer Metrics:**
  - `rag_retrieval_duration_seconds` *(Timer)*: Latency of candidate resolution and SQL execution.
  - `rag_similarity_score` *(DistributionSummary)*: Distribution of peak retrieval scores.
  - `rag_quality_gate_evaluations_total{verdict="pass|fail"}` *(Counter)*: Tracks gate passes vs failures.

###### 6. What if it breaks? (Edge cases)
1. **Client Has Not Completed Risk Assessment:**
   - *What happens:* `resolveCandidateIsins` finds no completed risk assessment.
   - *How it is handled:* Falls back to `eligibleFundRepository.findByIsActiveTrue()`, treating the query as a general regulatory factsheet lookup without guessing the client's suitability.
2. **PostgreSQL pgvector Extension Becomes Unavailable:**
   - *What happens:* Vector cosine operator `<=>` fails.
   - *How it is handled:* Caught safely by Spring Data exception translation; returns an empty evidence response with `isSufficient = false` rather than crashing the request.

---

##### Stage 4: Query Refinement Loop & Defensive Degradation

*Code References:*
- **Query Refiner Service:** `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/service/RagQueryRefinerService.java`
- **RAG Synthesis Service:** `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/service/RagSynthesisService.java`
- **Unit Test Suite:** `backend-java/src/test/java/com/wealthtech/crm/modules/portfolioreview/service/RagQueryRefinerServiceTest.java`

###### 1. What was built?
1. **Evidence Quality Gate:**
   - Evaluates whether the peak retrieved chunk score meets the 0.65 cutoff. If below 0.65, synthesis is paused.
2. **Intent-Driven Canonical Query Expansion (`refineQuery`):**
   - Automatically detects conversational words and appends standardized SEBI terminology:
     - *"fees / cost / expense / ter"* $\longrightarrow$ Appends `" Total Expense Ratio TER Direct Plan Regular Plan expense disclosure"`
     - *"risk / safe / volatile / danger"* $\longrightarrow$ Appends `" Riskometer Product Labeling SEBI risk band suitability"`
     - *"sector / holding / stock / company"* $\longrightarrow$ Appends `" portfolio holdings sector allocation top 10 assets factsheet"`
     - *"hybrid / conservative / debt"* $\longrightarrow$ Appends `" Parag Parikh Conservative Hybrid Fund asset allocation debt equity SID"`
     - *"tax / elss / 80c"* $\longrightarrow$ Appends `" Parag Parikh ELSS Tax Saver Fund 3 year lock-in equity SID"`
     - *Default fallback:* Appends `" mutual fund factsheet Scheme Information Document SID disclosure"`
3. **Automated Single-Shot Re-Retrieval (1 Retry Limit):**
   - Re-runs hybrid retrieval with the expanded query. If `retryResponse.isSufficient()` or `retryScore > originalScore`, the improved evidence is adopted. Capped at exactly 1 retry to bound latency under 80ms.
4. **Defensive Degradation (Safe Refusal & Total LLM Bypass):**
   - If the score remains $< 0.65$ after retry, the system **completely skips calling Google Gemini**, saving 100% of LLM token costs and eliminating hallucinations:
     > *"Based on official mutual fund regulatory disclosures, no verified document chunks met the required quality relevance threshold (0.65) to answer your query reliably..."*

###### 2. Why this? (Choices & Trade-offs)
- **Why Was 0.65 Chosen for the Evidence Quality Gate? (How Did We Arrive at This Value?)**
  - "In normal chatbots, developers use lower cutoffs around 0.40 to 0.50. But in financial advisory, all mutual fund documents share the exact same dense jargon (NAV, AUM, SEBI, Riskometer), which makes completely wrong funds score around 0.55. That 0.50 to 0.64 range is the 'hallucination danger zone' where an AI gets confused and invents numbers. 0.65 is the proven industry standard cutoff for dense embedding models like Google text-embedding-004. When we calibrated our system against our Golden Dataset in `RagRetrievalBenchmarkTest.java`, 0.65 was the exact sweet spot that achieved over 80% retrieval accuracy while completely blocking ungrounded data from reaching Gemini."
  - *Pivot for the Adaptive Feedback Loop:* The 0.65 threshold acts as the exact trigger for Canonical Query Expansion. If an advisor asks *"What is the cost of holding this fund?"*, the colloquial word *"cost"* yields an initial hybrid score of ~0.61 against a factsheet that only writes *"TER"*. Because 0.61 is below 0.65, the system intercepts it, appends official SEBI terminology (`"Total Expense Ratio TER Direct Plan"`), and the second-pass retrieval jumps to **0.82**, cleanly passing the gate.
- **Why Rule-Based Canonical Expansion Instead of an LLM Query-Rewriter or Step-Back Prompting?**
  - *Speed & Cost:* Calling an LLM to rephrase a search query adds 500ms–1500ms of delay and burns token quotas. Our intent dictionary runs on the CPU in **$< 1\text{ ms}$ for free**.
  - *Zero Hallucination:* SEBI regulatory terms are fixed (`TER`, `Riskometer`, `SID`). Dictionary expansion guarantees 100% exact regulatory words every time.
- **Why Defensive Degradation Instead of Letting the LLM Guess?**
  - In wealth management, an ungrounded guess about fund returns or exit fees carries legal liability. It is far better to honestly state *"evidence is insufficient"* than to let an AI hallucinate financial figures.

###### 3. How was it checked?
* **Automated JUnit 5 Tests (`RagQueryRefinerServiceTest.java`, `RagSynthesisServiceTest.java`):**
  - Verified expansion strategies for fees, risk, holdings, and general fallback queries.
  - Verified that when refined queries score higher, new evidence is adopted; when scores remain $<0.65$, Gemini is completely bypassed.

###### 4. What unit tests? (JUnit 5 Pseudo-code)
* **Test Case 1: Fee Intent Detection & Canonical Expansion**
  ```java
  @Test
  void shouldExpandExpenseRatioQuery() {
      RefinedQueryResult result = queryRefinerService.refineQuery("What are the fees for HDFC Top 100?");
      assertTrue(result.wasRefined());
      assertEquals("EXPENSE_RATIO_EXPANSION", result.refinementStrategy());
      assertTrue(result.refinedQuery().contains("Total Expense Ratio TER Direct Plan"));
  }
  ```
* **Test Case 2: Defensive Degradation Bypass on Persistent Low Score**
  ```java
  @Test
  void shouldBypassLlmWhenEvidenceRemainsInsufficient() {
      when(retrievalService.retrieveEvidence(any())).thenReturn(insufficientResponse(0.45));
      RagQueryResponse response = synthesisService.queryAndSynthesize(new RagQueryRequest("Weather in Mumbai", null, null, null));
      assertFalse(response.isGrounded());
      assertTrue(response.answer().contains("no verified document chunks met the required quality relevance threshold"));
      verify(generationService, never()).generateGroundedResponse(any(), any());
  }
  ```

###### 5. Where are logs & metrics?
* **SLF4J Logs:**
  - `log.info("Quality gate failed for query '{}'. Initiating query refinement loop...", request.query())`
  - `log.info("Query refinement improved evidence relevance (score: {} -> {})", prevScore, newScore)`
* **Micrometer Metrics:**
  - `rag_synthesis_total{grounded="true|false"}` *(Counter)*: Tracks grounded synthesis vs defensive refusals.

###### 6. What if it breaks? (Edge cases)
1. **Query Refinement Dilutes Score ("Score Drift"):**
   - *What happens:* Adding words to the query makes the second vector search score *lower* (e.g. 0.54 instead of 0.62).
   - *How it is handled:* The service explicitly checks `retryResponse.ragSimilarityScore() > retrievalResponse.ragSimilarityScore()`. If the retry performed worse, it discards the retry and safely triggers defensive degradation.

---

##### Stage 5: Bidirectional PII Sanitization Gateway

*Code References:*
- **PII Protection Gateway:** `backend-java/src/main/java/com/wealthtech/crm/infrastructure/ai/security/PiiProtectionGateway.java`
- **PII Tokenization Result:** `backend-java/src/main/java/com/wealthtech/crm/infrastructure/ai/security/PiiTokenizationResult.java`
- **Unit Test Suite:** `backend-java/src/test/java/com/wealthtech/crm/infrastructure/ai/security/PiiProtectionGatewayTest.java`

###### 1. What was built?
1. **Forward Pass (Two-Layer Sanitization):**
   - **Layer 1 (Known Entity Redaction):** Injects authenticated `Client` and `ClientProfile` fields, sorts candidate values **descending by string length** (`Rahul Sharma` before `Rahul`) to avoid substring corruption, and substitutes them with surrogate tokens (`{{CLIENT_NAME_1}}`, `{{CLIENT_PAN_1}}`).
   - **Layer 2 (Universal Regex Fallback):** Scans for arbitrary Indian PII patterns (PAN `\b[A-Z]{5}[0-9]{4}[A-Z]\b`, Aadhaar `\b\d{4}[\s\-]\d{4}[\s\-]\d{4}\b`, 10-digit mobile `[6-9]\d{9}`, and email addresses), replacing them with typed surrogate tokens stored in an ephemeral `LinkedHashMap` token vault.
2. **Backward Pass (Rehydration):**
   - **Mode A (In-Memory Closure):** `rehydrate(responseText, vault)` executes in $\sim 0.1\text{ ms}$ before returning the response to the caller.
   - **Mode B (Database Entity Rehydration):** `rehydrateWithEntity(text, client, profile)` is used by asynchronous background workers (e.g. `PortfolioPdfGeneratorService`) to reconstitute authentic client values directly from PostgreSQL without needing request-scoped memory vaults.

###### 2. Why this? (Choices & Trade-offs)
- **Why in our Financial & Regulatory Context:**
  - Under SEBI regulations and India's Digital Personal Data Protection (DPDP) Act 2023, transmitting unmasked client PAN cards, Aadhaar numbers, or personal contact details to external cloud AI endpoints (Google Gemini) is a serious regulatory compliance violation.
- **Why Deterministic Regex Over Heavy Machine Learning NER (spaCy, Presidio)?**
  - Indian financial identifiers follow rigid, government-mandated syntax (PAN is always 5 letters + 4 digits + 1 letter; Aadhaar is always 12 digits; mobile is always 10 digits starting with 6–9). Compiled Java `Pattern` instances execute in under **1 millisecond** with zero external model dependencies and zero chance of hallucinated redactions.

###### 3. How was it checked?
* **Automated JUnit 5 Test Suite (`PiiProtectionGatewayTest.java`):**
  - Verified redaction of Indian PAN, Aadhaar, email, and 10-digit phone numbers.
  - Verified that substring collisions (e.g., first name `"Amit"` inside full name `"Amitabh"`) do not corrupt tokenization.
  - Verified 100% lossless round-trip rehydration.

###### 4. What unit tests? (JUnit 5 Pseudo-code)
* **Test Case 1: Indian PAN and Aadhaar Redaction**
  ```java
  @Test
  void shouldRedactPanAndAadhaarToSurrogateTokens() {
      String prompt = "Client ABCDE1234F with Aadhaar 1234 5678 9012 wants fund review.";
      PiiTokenizationResult result = gateway.tokenizeText(prompt);
      assertFalse(result.sanitizedText().contains("ABCDE1234F"));
      assertTrue(result.sanitizedText().contains("{{CLIENT_PAN_1}}"));
      assertTrue(result.sanitizedText().contains("{{CLIENT_AADHAAR_1}}"));
  }
  ```
* **Test Case 2: Lossless Backward Pass Rehydration**
  ```java
  @Test
  void shouldLosslesslyRehydrateTokensInResponse() {
      String rawPrompt = "Review for rahul.sharma@example.com";
      PiiTokenizationResult tokenResult = gateway.tokenizeText(rawPrompt);
      String llmAnswer = "Generated advice for " + tokenResult.sanitizedText();
      String finalAnswer = gateway.rehydrate(llmAnswer, tokenResult.vault());
      assertTrue(finalAnswer.contains("rahul.sharma@example.com"));
      assertFalse(finalAnswer.contains("{{CLIENT_EMAIL_1}}"));
  }
  ```

###### 5. Where are logs & metrics?
* **SLF4J Logs:**
  - `log.debug("Sanitized {} PII tokens from input prompt", vault.size())`
  - Zero PII is ever written to log files; only token counts and token types are logged.
* **Micrometer Metrics:**
  - `pii_tokenization_latency_seconds` *(Timer)*: Tracks latency of forward and backward passes.

###### 6. What if it breaks? (Edge cases)
1. **Advisor Omits `clientId`:**
   - *What happens:* Query contains arbitrary free-form names without an authenticated client profile.
   - *How it is handled:* The backend **refuses to do fuzzy text guessing across PostgreSQL** (`Client.findByName`) to prevent cross-client data leaks. Layer 2 universal regex guarantees that PAN, Aadhaar, phone, and email are still redacted before reaching Gemini.

---

##### Stage 6: Resilient Model Cascading & Circuit Breaking

*Code References:*
- **Generation Service:** `backend-java/src/main/java/com/wealthtech/crm/infrastructure/ai/GeminiGenerationService.java`
- **Resilience Config:** `backend-java/src/main/java/com/wealthtech/crm/infrastructure/config/ResilienceProperties.java`
- **Unit Test Suite:** `backend-java/src/test/java/com/wealthtech/crm/infrastructure/ai/GeminiGenerationServiceTest.java`

###### 1. What was built?
1. **Ordered Priority Fallback Cascade:**
   - Routes grounded prompts through an ordered fallback sequence:
     $$\text{Primary: } \texttt{gemini-2.0-flash} \xrightarrow{\text{HTTP 429}} \text{Secondary: } \texttt{gemini-3.5-flash} \xrightarrow{\text{HTTP 429}} \text{Tertiary: } \texttt{gemini-flash-latest}$$
2. **Differentiated Failure Policies:**
   - *HTTP 429 (Rate Limit / Quota Exhaustion):* Immediately cascades to the next fallback model with **0 ms delay**, since retrying a rate-limited quota bucket burns retries fruitlessly.
   - *HTTP 503 / 5xx / Socket Timeouts:* Retries up to 3 times on the *same* model with exponential backoff and randomized jitter (`1000ms`, `2000ms`, `4000ms` + jitter).
3. **Honest Sentinel Fallback:**
   - If all models in the cascade are exhausted, returns `SYNTHESIS_UNAVAILABLE_SENTINEL` while returning the raw retrieved factsheets so advisors can inspect verified metrics directly.

###### 2. Why this? (Choices & Trade-offs)
- **Why Immediate Cascade on 429 Instead of Exponential Backoff?**
  - An HTTP 429 response means Google's rate window (RPM/TPM) is exhausted for that model key. Waiting 1000ms and retrying the same model almost always yields another 429, adding 3–5 seconds of useless advisor delay. Cascading immediately to a different model with a distinct quota bucket succeeds in $<300\text{ ms}$.

###### 3. How was it checked?
* **Automated JUnit 5 Test Suite (`GeminiGenerationServiceTest.java`):**
  - Verified immediate cascade on simulated HTTP 429 without sleeping.
  - Verified exponential backoff with jitter on HTTP 503.
  - Verified sentinel fallback when all models fail.

###### 4. What unit tests? (JUnit 5 Pseudo-code)
* **Test Case 1: HTTP 429 Cascades to Secondary Model**
  ```java
  @Test
  void shouldCascadeToSecondaryModelOn429() throws Exception {
      when(httpClient.send(argThat(req -> req.uri().toString().contains("gemini-2.0-flash")), any()))
              .thenReturn(mockHttpResponse(429, "Quota Exceeded"));
      when(httpClient.send(argThat(req -> req.uri().toString().contains("gemini-3.5-flash")), any()))
              .thenReturn(mockHttpResponse(200, "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Grounded Advice\"}]}}]}"));

      String answer = generationService.generateGroundedResponse("System Instruction", "Prompt");
      assertEquals("Grounded Advice", answer);
  }
  ```

###### 5. Where are logs & metrics?
* **SLF4J Logs:**
  - `log.warn("Model {} returned HTTP 429 Quota Exhausted. Cascading immediately to next fallback...", currentModel)`
  - `log.error("All generation models exhausted in cascade. Returning honest sentinel fallback.")`
* **Micrometer Metrics:**
  - `gemini_generation_duration_seconds` *(Timer)*: Tracks end-to-end generation latency.
  - `gemini_generation_calls_total{status="success|fallback|error"}` *(Counter)*: Tracks success vs fallback rates.

###### 6. What if it breaks? (Edge cases)
1. **Complete Google API Cloud Outage:**
   - *What happens:* All Google endpoints return 500 or timeout.
   - *How it is handled:* Returns the sentinel message and includes the raw retrieved factsheet snippets in the UI, allowing the advisor to read the verified tables manually without seeing a broken blank screen.

---

#### 9.2 Agentic AI Architecture & Tooling Framework

##### 9.2.1 Agent Execution Strategy Resolver, Spring AI & MCP SDK

*Code References:*
- **Strategy Resolver:** `backend-java/src/main/java/com/wealthtech/crm/modules/agent/strategy/AgentExecutionStrategyResolver.java`
- **Spring AI Strategy:** `backend-java/src/main/java/com/wealthtech/crm/modules/agent/strategy/impl/SpringAiAgentStrategy.java`
- **MCP Strategy:** `backend-java/src/main/java/com/wealthtech/crm/modules/agent/strategy/impl/McpJavaAgentStrategy.java`
- **Vanilla Strategy:** `backend-java/src/main/java/com/wealthtech/crm/modules/agent/strategy/impl/VanillaJavaAgentStrategy.java`
- **MCP Server & Client:** `backend-java/src/main/java/com/wealthtech/crm/modules/agent/mcp/server/McpServer.java`

###### 1. What was built?
1. **Pluggable Agent Strategy Pattern (`AgentExecutionStrategyResolver`):**
   - Dynamically resolves the execution engine based on `AgentMode`:
     - **`AgentMode.FRAMEWORK`:** Uses Spring AI `ChatClient` with native function calling.
     - **`AgentMode.MCP`:** Uses the Model Context Protocol (MCP) client-server architecture.
     - **`AgentMode.VANILLA`:** Offline deterministic ReAct loop for CI testing and fallback.
2. **Finite Step Boundary & Loop Guard (`maxSteps = 5`):**
   - Enforces a hard convergence limit of 5 reasoning turns to prevent runaway recursive tool loops and quota drainage.
3. **Strict Database Staging Boundary (Human-in-the-Loop Safeguard):**
   - The AI agent has **zero authority to execute live database mutations or commit transactions**.
   - It can only stage an editable **draft recommendation proposal** (`PortfolioRecommendation`) in PostgreSQL with status `SAVED`. A licensed human advisor must review, adjust allocations, and confirm before client-facing PDFs can be generated.

###### 2. Why this? (Choices & Trade-offs)
- **Why Model Context Protocol (MCP) in Addition to Spring AI?**
  - Spring AI function calling tightly couples tool execution to Spring's internal runtime. By exposing the same tools via an MCP Server (`McpServer.java`), our WealthTech advisory tools become plug-and-play with external agents (Claude Desktop, external LangGraph runners) without modifying backend business logic.
- **Why Enforce Human-in-the-Loop (HITL) Staging?**
  - Under SEBI (Investment Advisers) Regulations, 2013, an algorithm cannot legally transact on behalf of a retail investor without explicit human fiduciary review.

###### 3. How was it checked?
* **Automated JUnit 5 Test Suite (`AgentStrategyAndControllerTest.java`, `SpringAiAgentStrategyTest.java`, `McpJavaAgentStrategyTest.java`, `VanillaAgentExecutorTest.java`):**
  - Verified strategy resolution across all 3 modes.
  - Verified that exceeding `maxSteps` halts cleanly without throwing unhandled exceptions.
  - Verified draft proposal staging with status `SAVED`.

###### 4. What unit tests? (JUnit 5 Pseudo-code)
* **Test Case 1: Strategy Resolution & Fallback to Vanilla**
  ```java
  @Test
  void shouldResolveVanillaStrategyWhenRequested() {
      AgentExecutionStrategy strategy = strategyResolver.resolve(AgentMode.VANILLA);
      assertEquals(AgentMode.VANILLA, strategy.getSupportedMode());
  }
  ```
* **Test Case 2: Max Step Convergence Guard**
  ```java
  @Test
  void shouldHaltWhenMaxStepsExceededWithoutConvergence() {
      AgentRunRequest request = new AgentRunRequest(101L, "Infinite tool call loop goal", AgentMode.VANILLA);
      AgentExecutionResult result = strategy.execute(request);
      assertTrue(result.steps().size() <= 5);
  }
  ```

###### 5. Where are logs & metrics?
* **SLF4J Logs:**
  - `log.info("Executing agent goal via {} strategy for client: {}", strategy.getSupportedMode(), request.clientId())`
  - `log.warn("Agent reached maximum step limit ({}) without converging on proposal", maxSteps)`
* **Micrometer Metrics:**
  - `agent_execution_duration_seconds` *(Timer)*: Tracks total multi-turn agent run duration.
  - `agent_steps_per_run` *(DistributionSummary)*: Tracks number of reasoning turns per execution.

###### 6. What if it breaks? (Edge cases)
1. **Agent Gets Stuck in Repeated Tool Calls:**
   - *What happens:* Model calls `getPortfolioReview` repeatedly without progressing to `stageDraftProposal`.
   - *How it is handled:* The step counter increments each turn. When `stepCount == 5`, the loop terminates immediately, returning the recorded steps and a partial status message.

---

##### 9.2.2 The 5 Core Advisory Tools & Schema Validation

*Code References:*
- **Tool Registry:** `backend-java/src/main/java/com/wealthtech/crm/modules/agent/tool/AgentToolRegistry.java`
- **Domain Tools:** `backend-java/src/main/java/com/wealthtech/crm/modules/agent/tool/impl/*`
  - `ClientProfileTool.java`
  - `RiskAssessmentTool.java`
  - `PortfolioReviewTool.java`
  - `FundResearchRagTool.java`
  - `StageRecommendationDraftTool.java`

###### 1. What was built?
1. **Central Tool Registry (`AgentToolRegistry`):**
   - Automatically registers all Spring-managed `AgentTool` beans and exports OpenAPI-compliant parameter declarations via `getGeminiFunctionDeclarations()`.
2. **The 5 Specialized Domain Tools:**
   - **`getClientProfile`:** Validates client KYC status (`VERIFIED` vs `PENDING`).
   - **`getClientRiskAssessment`:** Extracts client's mandatory SEBI risk band (`CONSERVATIVE`, `MODERATE`, `AGGRESSIVE`).
   - **`getPortfolioReview`:** Identifies underperforming holdings tagged for `SELL` and sums available exit proceeds.
   - **`searchEligibleFunds`:** Bridges directly to Stage 3 Hybrid RAG retrieval over official mutual fund factsheets and SIDs.
   - **`stage_recommendation_proposal`:** Deterministically validates investment amounts, enforces `allocatedTotal === totalInvestable`, and stages the draft proposal in PostgreSQL.
3. **Sandboxed Error Isolation:**
   - Tool executions wrap database calls in `try/catch`, returning an error string in `AgentToolResult` rather than throwing exceptions, enabling the LLM to self-heal and rephrase arguments.

###### 2. Why this? (Choices & Trade-offs)
- **Why Does `searchEligibleFunds` Use Hybrid RAG Instead of a Simple Database Query?**
  - A simple DB query against `EligibleFund` only returns scheme names and ISINs. It **cannot** provide the fund's dynamic Total Expense Ratio (TER), exit load table, or asset allocation, which reside inside factsheet PDFs.
  - If the tool only returned a database list, the LLM would be forced to **hallucinate and guess** expense ratios and return percentages in the recommendation rationale—violating SEBI regulations. Hybrid RAG provides verified source snippets (`[Source 1]`) ensuring zero-hallucination compliance.

###### 3. How was it checked?
* **Automated JUnit 5 Tests (`AgentToolsTest.java`):**
  - Verified registration of all 5 domain tools.
  - Verified OpenAPI schema generation from `getGeminiFunctionDeclarations()`.
  - Verified math validation in `StageRecommendationDraftTool`.

###### 4. What unit tests? (JUnit 5 Pseudo-code)
* **Test Case 1: Mathematical Allocation Validation**
  ```java
  @Test
  void shouldRejectProposalWhenAllocationDoesNotEqualInvestableProceeds() {
      Map<String, Object> args = Map.of(
          "client_id", 101,
          "flow_type", "REPLACE_FUNDS",
          "funds", List.of(Map.of("eligible_fund_id", 1, "amount", 50000)) // Only 50k allocated out of 60k
      );
      AgentToolResult result = stageTool.execute(args, contextWith60kProceeds);
      assertFalse(result.isSuccess());
      assertTrue(result.getError().contains("Allocation mismatch"));
  }
  ```

###### 5. Where are logs & metrics?
* **SLF4J Logs:**
  - `log.info("Tool '{}' executed successfully in {} ms", toolName, latency)`
  - `log.error("Tool '{}' failed with error: {}", toolName, errorMessage)`
* **Micrometer Metrics:**
  - `agent_tool_execution_duration_seconds{tool="..."}` *(Timer)*: Latency per tool invocation.

###### 6. What if it breaks? (Edge cases)
1. **Client ID Does Not Exist in Database:**
   - *What happens:* LLM passes an invalid `clientId`.
   - *How it is handled:* Returns `AgentToolResult.error("Client not found with ID: xyz")`. The LLM receives this in its conversation history and halts or asks the advisor for a valid ID.

---

#### 9.3 Core Backend

##### 9.3.1 Security, Authentication & JWT Lifecycle

*Code References:*
- **Security Configuration:** `backend-java/src/main/java/com/wealthtech/crm/security/SecurityConfig.java`
- **JWT Filter:** `backend-java/src/main/java/com/wealthtech/crm/security/JwtAuthenticationFilter.java`
- **JWT Token Provider:** `backend-java/src/main/java/com/wealthtech/crm/security/JwtTokenProvider.java`
- **Auth Service:** `backend-java/src/main/java/com/wealthtech/crm/modules/auth/service/AuthService.java`

###### 1. What was built?
1. **Stateless Security Filter Chain:**
   - Configures Spring Security with `SessionCreationPolicy.STATELESS` and CSRF disabled (since Bearer tokens are not vulnerable to ambient browser CSRF).
2. **`JwtAuthenticationFilter` (`OncePerRequestFilter`):**
   - Intercepts every incoming request, extracts the Bearer token from the `Authorization` header, verifies the HMAC-SHA256 signature, extracts the user email, loads authorities from `CustomUserDetailsService`, and sets `SecurityContextHolder.getContext().setAuthentication(...)`.
3. **Token Pair Issuance (`POST /api/v1/auth/login`):**
   - Issues a short-lived **access token (15 mins)** in the JSON response body.
   - Sets a long-lived **refresh token (7 days)** in a secure `HttpOnly`, `SameSite=Strict` cookie scoped strictly to `/java-wtc-api/v1/auth`.

###### 2. Why this? (Choices & Trade-offs)
- **Why Database Lookup in `UserDetailsService` on Every Request?**
  - Pure stateless JWTs cannot be revoked immediately if an employee is terminated or permissions change. Querying the database to populate authorities guarantees instant access revocation when `user.isActive == false`, prioritizing security over microsecond cache savings in wealth management.

###### 3. How was it checked?
* **Automated JUnit 5 Suites (`JwtTokenProviderTest.java`, `AuthServiceTest.java`):**
  - Verified signature verification, expired token rejection, and `HttpOnly` cookie generation.

###### 4. What unit tests? (JUnit 5 Pseudo-code)
* **Test Case 1: Expired Token Rejection**
  ```java
  @Test
  void shouldRejectExpiredJwtToken() {
      String expiredToken = jwtTokenProvider.generateExpiredTokenForTesting("advisor@wealthtech.com");
      assertFalse(jwtTokenProvider.validateToken(expiredToken));
  }
  ```

###### 5. Where are logs & metrics?
* **SLF4J Logs:**
  - `log.warn("Invalid JWT signature: {}", e.getMessage())`
  - `log.info("User {} successfully authenticated", email)`
* **Micrometer Metrics:**
  - `auth_login_total{status="success|failure"}` *(Counter)*: Tracks successful vs failed login attempts.

###### 6. What if it breaks? (Edge cases)
1. **JWT Secret Key Leak:**
   - *What happens:* Attacker attempts to forge tokens.
   - *How it is handled:* Key is injected from environment variables (`JWT_SECRET`). Rotating the secret immediately invalidates all active access tokens.

---

##### 9.3.2 Fine-Grained RBAC & Method Security

*Code References:*
- **User Details Service:** `backend-java/src/main/java/com/wealthtech/crm/modules/usermanager/service/CustomUserDetailsService.java`
- **Role & Permission Entities:** `backend-java/src/main/java/com/wealthtech/crm/modules/usermanager/entity/*`
- **Security Config:** `backend-java/src/main/java/com/wealthtech/crm/security/SecurityConfig.java`

###### 1. What was built?
1. **Method-Level Security (`@EnableMethodSecurity`):**
   - Guards service and controller endpoints using granular permission checks:
     ```java
     @PreAuthorize("hasAuthority('PORTFOLIO_REVIEW_CREATE')")
     ```
2. **Authority Mapping (`CustomUserDetailsService`):**
   - Maps both the role (with standard Spring `ROLE_` prefix) and fine-grained permissions (e.g. `PORTFOLIO_REVIEW_APPROVE`, `CLIENT_MANAGEMENT_WRITE`) as distinct `GrantedAuthority` objects in Spring's `SecurityContext`.

###### 2. Why this? (Choices & Trade-offs)
- **Role-Based vs. Permission-Based Authorization:**
  - Checking roles directly (`hasRole('ADMIN')`) couples code to organizational titles. If a new role ("Senior Associate RM") is introduced, every endpoint must be refactored. Checking granular permissions (`hasAuthority('PORTFOLIO_REVIEW_APPROVE')`) allows role definitions to change in the database with zero code modifications.

###### 3. How was it checked?
* **Automated JUnit 5 Suites (`CustomUserDetailsServiceTest.java`, `RoleServiceTest.java`):**
  - Verified authority mapping and `AccessDeniedException` on unauthorized invocations.

###### 4. What unit tests? (JUnit 5 Pseudo-code)
* **Test Case 1: Granular Permission Validation**
  ```java
  @Test
  void shouldGrantAuthorityMatchingAssignedPermissions() {
      UserDetails userDetails = userDetailsService.loadUserByUsername("rm@wealthtech.com");
      assertTrue(userDetails.getAuthorities().contains(new SimpleGrantedAuthority("PORTFOLIO_REVIEW_CREATE")));
  }
  ```

###### 5. Where are logs & metrics?
* **SLF4J Logs:**
  - `log.warn("Access denied for user {} attempting to access protected resource", email)`
* **Micrometer Metrics:**
  - `security_access_denied_total` *(Counter)*: Tracks unauthorized 403 Forbidden events.

###### 6. What if it breaks? (Edge cases)
1. **User Assigned to Inactive Role:**
   - *What happens:* Admin deactivates a role.
   - *How it is handled:* `CustomUserDetailsService` checks `role.isActive == true`. Inactive roles yield an empty authority set, blocking all protected endpoints.

---

##### 9.3.3 PostgreSQL Schema Design, pgvector HNSW & Hibernate Optimizations

*Code References:*
- **Entities:** `PortfolioReview.java`, `Client.java`, `ClientProfile.java`, `FundDocumentEmbedding.java`
- **Repositories:** `ClientRepository.java`, `PortfolioReviewRepository.java`

###### 1. What was built?
1. **Relational Schema with B-Tree & HNSW Indexes:**
   - Standard relational tables with explicit foreign key constraints and B-Tree indexes on high-cardinality lookup columns (`isin`, `client_id`, `score_category`).
   - HNSW graph index on vector columns for fast approximate nearest neighbor search.
2. **Eliminating the Hibernate N+1 Query Problem:**
   - Uses **`JOIN FETCH`** in JPQL queries and Spring Data **`@EntityGraph`** to hydrate parent-child associations (`Client` $\rightarrow$ `ClientProfile` $\rightarrow$ `User`) in a single consolidated SQL outer join instead of $N+1$ separate round-trips.
3. **Optimistic Locking Concurrency Guard (`@Version`):**
   - High-concurrency entities (like `PortfolioReview`) use `@Version private Long version;` to prevent lost updates when two advisors review the same portfolio concurrently.

###### 2. Why this? (Choices & Trade-offs)
- **Optimistic Locking vs. Pessimistic Locking (`SELECT FOR UPDATE`):**
  - Wealth management advisory workflows are read-heavy. Pessimistic row locks hold database connections open and create deadlock risk. Optimistic locking avoids lock contention and catches rare concurrent collisions safely with an `OptimisticLockingFailureException`.

###### 3. How was it checked?
* **Automated Testing:**
  - Inspected SQL query counts in test logs with `spring.jpa.properties.hibernate.generate_statistics=true` to confirm N+1 query elimination.

###### 4. What unit tests? (JUnit 5 Pseudo-code)
* **Test Case 1: Optimistic Locking Collision Detection**
  ```java
  @Test
  void shouldThrowOptimisticLockExceptionOnConcurrentUpdate() {
      PortfolioReview reviewA = reviewRepository.findById(1L).get();
      PortfolioReview reviewB = reviewRepository.findById(1L).get();

      reviewA.setStatus(ReviewStatus.COMPLETED);
      reviewRepository.saveAndFlush(reviewA);

      reviewB.setStatus(ReviewStatus.FAILED);
      assertThrows(OptimisticLockingFailureException.class, () -> reviewRepository.saveAndFlush(reviewB));
  }
  ```

###### 5. Where are logs & metrics?
* **SLF4J / Hibernate Logs:**
  - `org.hibernate.stat: DEBUG` displays statement execution counts and cache hit ratios.
* **Micrometer Metrics:**
  - `hikaricp_connections_active` *(Gauge)*: Monitors connection pool saturation.

###### 6. What if it breaks? (Edge cases)
1. **Database Connection Pool Exhaustion:**
   - *What happens:* High concurrent load exhausts HikariCP connections.
   - *How it is handled:* HikariCP is configured with a 30-second connection timeout and max pool size of 20, failing fast with a clean `503 Service Unavailable` rather than hanging requests indefinitely.

---

##### 9.3.4 Asynchronous eCAS Processing (@Async) & SEBI Advisory Gates

*Code References:*
- **S3 Service:** `backend-java/src/main/java/com/wealthtech/crm/infrastructure/s3/S3Service.java`
- **PDF Generator:** `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/service/PortfolioPdfGeneratorService.java`
- **Review Service:** `backend-java/src/main/java/com/wealthtech/crm/modules/portfolioreview/service/PortfolioReviewService.java`

###### 1. What was built?
1. **Tomcat Thread Offloading (`@Async`):**
   - Offloads CPU-intensive PDF generation from Tomcat HTTP threads to Spring's `ThreadPoolTaskExecutor`, immediately returning `HTTP 202 Accepted` with a tracking ID.
2. **In-Memory Rendering & S3 Pre-signed URLs:**
   - Renders PDFs completely in RAM via `ByteArrayOutputStream` with **zero local disk storage**, streaming bytes directly to AWS S3.
   - Generates time-bound **pre-signed S3 download URLs (15-minute validity)** via AWS S3 SDK v2 so browsers download directly from S3 without proxying file streams through API servers.
3. **The 3 SEBI Advisory Compliance Gates:**
   - Before any recommendation can be staged or downloaded, `PortfolioReviewService` enforces:
     1. *Gate 1 (KYC Gate):* Client KYC status must equal `VERIFIED`.
     2. *Gate 2 (Suitability Gate):* Client must have a completed SEBI risk assessment matching proposed funds.
     3. *Gate 3 (Math Gate):* Total allocated capital must exactly balance total available sell proceeds.

###### 2. Why this? (Choices & Trade-offs)
- **Why In-Memory Buffer Rendering Instead of Local Filesystem?**
  - In containerized environments (Docker, Kubernetes), writing PDFs to `/tmp` consumes ephemeral disk space and creates privacy compliance risks if files persist across container restarts. Direct memory-to-S3 streaming guarantees zero lingering PII.

###### 3. How was it checked?
* **Automated JUnit 5 Test Suite (`PortfolioPdfGeneratorServiceTest.java`, `S3ServiceTest.java`):**
  - Verified pre-signed URL expiry calculation and in-memory byte rendering.

###### 4. What unit tests? (JUnit 5 Pseudo-code)
* **Test Case 1: In-Memory PDF Generation & S3 Upload**
  ```java
  @Test
  void shouldGeneratePdfInMemoryAndReturnPresignedUrl() {
      PortfolioRecommendation rec = createMockRecommendation();
      GeneratedPdfResult result = pdfGeneratorService.generateRecommendationPdf(rec);
      assertNotNull(result.presignedUrl());
      assertTrue(result.presignedUrl().contains("X-Amz-Expires=900"));
  }
  ```

###### 5. Where are logs & metrics?
* **SLF4J Logs:**
  - `log.info("Successfully rendered proposal PDF in RAM ({} bytes) and uploaded to S3 key: {}", bytes.length, key)`
* **Micrometer Metrics:**
  - `s3_upload_duration_seconds` *(Timer)*: Tracks latency of S3 streaming operations.

###### 6. What if it breaks? (Edge cases)
1. **AWS S3 Outage / Network Timeout:**
   - *What happens:* S3 endpoint returns 500 or times out.
   - *How it is handled:* Handled via `ResilienceProperties.getS3()` with exponential backoff and jitter (3 retries). If still unavailable, the job status is set to `FAILED` with a retry prompt in the UI.

---




