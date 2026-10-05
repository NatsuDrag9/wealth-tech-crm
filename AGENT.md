# Project Conventions

## 1. Interview Coaching & Syntax Guardrails (High Priority)
- I am preparing for a Full-Stack interview. Do NOT write full files or complete blocks of code for me unless I explicitly use the words "create the files" OR "create them".
- Instead, serve as an interactive principle developer and coach: guide me through the syntax, explain the underlying logic, and provide the code. 
- Show me *what* needs to be written and explain *why*, but leave the implementation to me so I can build genuine understanding and muscle memory.

## Frontend Conventions
- Don't use arrow functions when creating functional React components. Use the standard `function()` declaration instead.
- Place `const` arrays in a separate `constants.ts` file within the local scoped folder. Don't place them within React components
- Place local types and interfaces in a separate `types.ts` file within the local scoped component folder.
- Create storybook files for UI only components with playfunctions to test interactions.
- Don't use props spreading (`{...props}`). Explicitly destructure, type, and pass every prop to components and JSX elements.
- Use ESLint and Stylelint as linters following the Airbnb style guide rules.
- Use only colors defined in the variables file. Don't hard code colors in any of the component scss files.
- Ensure all linting checks pass before commiting the code to github

## Git Commit Protocol
- Whenever creating a git commit, always slice workspace diffs into separate, granular commits to separate concerns.
- Always check existing formatting guidelines by running `git log --oneline -n 5` before creating messages.
- Match existing commit formats exactly.
- Do not commit any file starting with `To_*.md` where `*` is the wildcard.

## Code Review Protocol
- Whenever asked to review a file or a block of code, you must compile the project and run the unit tests first.
- Include the test outcomes, errors, or logs as part of your evaluation in the code review feedback.
- Add a backend related scope. For example, `fix(jb-<scope>)` , `feat(jb-<scope>)` for java backend and `fix(nb-<scope>)`, `feat(nb-<scope>)` for nodejs backend
- Ensure all files are free of `any`.
- Follow logger-before-error rule: every thrown error has a logger before it. If not, ask the user whether a logger is required

## 5. Resilience, Failure Handling & Telemetry Standards (Full-Stack Architecture - Java & Node.js)

### 5.1 Timeouts, Retries & Jitter
- **Read Operations vs State-Changing Operations**: 
  - Retrying safe/idempotent read operations (GET endpoints, database queries, vector searches, embedding calls) is permitted with bounded retries.
  - Retrying state-changing operations (POST/PUT/DELETE proposals, rebalancing orders, transactions, ingestion, background workers) is **strictly forbidden** without an idempotency key.
- **Exponential Backoff & Randomized Jitter**: All external network and API invocations (AWS S3, LocalStack, AI/LLM endpoints, third-party services) must implement exponential backoff with randomized jitter (e.g., `base * 2^attempt ± 20%`) to prevent thundering herd spikes during transient 429 or 5xx failures.
- **Strict Timeouts**: Never use unbounded network calls. Enforce explicit connect timeouts (10–15s) and request timeouts (25–30s) across all HTTP clients (Java `HttpClient`/`RestClient`, Node.js `axios`/`fetch`), database pools (HikariCP, Mongoose), and storage SDKs.

### 5.2 Defensive Failure Handling ("Assume Everything Will Break")
Every architectural component in both Java and Node.js must define defensive boundaries and graceful degradation:
- **API & Controller Tier**: Catch and handle 400, 401, 403, 404, 500, timeouts, and partial payloads. Always execute the `logger-before-error` rule prior to throwing or returning error responses.
- **Database & Storage Tier**: 
  - Prevent and handle connection pool exhaustion (HikariCP/Mongoose), deadlocks, slow queries, and transaction rollbacks gracefully.
  - S3 / LocalStack: Handle upload failures, expired pre-signed URLs, and network disconnects with appropriate fallbacks.
- **RAG & Search Tier**:
  - Eliminate duplicate chunks: Ingestion must be strictly idempotent (e.g. purge existing chunks for `(isin, document_type)` before saving new chunks).
  - Handle zero-result or low-relevance retrieval gracefully via quality gates before downstream consumption.
- **LLM / AI Tier**: Handle timeouts, rate limits (429), malformed JSON, hallucinated parameters, and context window limits. Provide local deterministic or rule-based fallbacks so unit tests and local dev never crash when cloud services are unavailable.

### 5.3 Idempotency & Concurrency Guards
- State-changing APIs (e.g. recommendation creation, PDF generation workers, document ingestion) must use idempotency tokens and atomic state checks to prevent duplicate execution, race conditions, or multiple concurrent background tasks.

### 5.4 Granular Telemetry & Latency Instrumentation
- Both backends must measure and expose performance metrics via Prometheus (`/actuator/prometheus` in Java, `/metrics` in Node.js):
  - End-to-end latency histograms: API request duration, DB query duration, S3 operations, and RAG/AI inference.
  - Failure & retry counters: Tracking errors by component, route, and status code.