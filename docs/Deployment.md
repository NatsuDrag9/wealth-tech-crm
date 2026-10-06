# Deployment Architecture & Free-Tier Hosting Guide

This document outlines the deployment strategy, free-tier hosting topology, environment configuration, and observability practices for the WealthTech CRM across both the React frontend and its backend implementations (Spring Boot & Node.js/Express).

---

## 1. High-Level Deployment Topology

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend Presentation Layer"]
        FE["React 19 + Vite SPA<br/>(Hosted on Vercel / Netlify Free Tier)"]
    end

    subgraph BackendJava["Java Ecosystem"]
        SB["Spring Boot 4 Backend<br/>(Render Free Web Service - Docker / Native)<br/>JVM Tuned: Max Heap 300MB"]
        Neon["Neon.tech Serverless Postgres<br/>(Free Tier - 0.5 GB Storage)"]
        SB -->|JDBC with SSL| Neon
    end

    subgraph BackendNode["Node.js Ecosystem (MERN Alternative)"]
        EX["Node.js + Express Backend<br/>(Render / Koyeb Free Web Service)"]
        Atlas["MongoDB Atlas M0 Sandbox<br/>(Free Tier - 512 MB Cluster)"]
        EX -->|Mongoose Connection| Atlas
    end

    FE -->|REST API Requests /api/v1| SB
    FE -.->|Alternative API Target| EX
```

### ASCII Architecture Reference

```text
                      ┌──────────────────────────┐
                      │  Frontend (React / Vite) │
                      │   Hosted on Vercel       │
                      └─────────────┬────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
       ┌────────────────────────┐      ┌────────────────────────┐
       │ Node.js / Express      │      │ Java Spring Boot       │
       │ Hosted on Render       │      │ Hosted on Render       │
       │ (Persistent Container) │      │ (JVM Tuned: 300MB)     │
       └───────────┬────────────┘      └───────────┬────────────┘
                   │                               │
                   ▼                               ▼
       ┌────────────────────────┐      ┌────────────────────────┐
       │ MongoDB Atlas          │      │ Neon PostgreSQL        │
       │ (Free M0 512MB)        │      │ (Free Serverless 0.5GB)│
       └────────────────────────┘      └────────────────────────┘
```

---

## 2. Docker & Environment Variable Loading Pipeline (Dual-Backend Architecture)

This section explains how environment variables (database credentials, JWT secrets, storage endpoints, and AI keys like `GEMINI_API_KEY`) are loaded and resolved across both the Java Spring Boot (`backend-java`) and Node.js Express (`backend-nodejs`) services.

```mermaid
flowchart TD
    Env["1. Host Root .env File<br/>(Database credentials, JWT secrets, AI keys)"] -->|"Docker Compose reads on startup"| DC["2. docker-compose.yml<br/>(Interpolates ${VAR} into environment: blocks)"]
    
    DC -->|"Injects Linux OS environment variables"| JavaCont["3A. crm-backend-java Container"]
    DC -->|"Injects Linux OS environment variables"| NodeCont["3B. crm-backend-nodejs Container"]
    
    JavaCont -->|"Spring Boot placeholder resolution & relaxed binding"| SBApp["4A. Spring Boot App<br/>application.yml (${VAR:}) & @Value"]
    NodeCont -->|"Node runtime global process environment"| NodeApp["4B. Node.js / Express App<br/>process.env.VAR"]
```

### The 3 Stages of Environment Loading

#### Stage 1: Host Level (Root `.env`)
* A single root `.env` file at the project root (`wealth-tech-crm/.env`) stores all sensitive local environment variables.
* **Security Guardrail**: The root `.env` is registered in `.gitignore` and is strictly excluded from version control. All teams and deployment environments use `.env.example` as the canonical template.

#### Stage 2: Docker Compose Orchestration (`docker-compose.yml`)
* When executing `docker compose up`, Docker Compose automatically parses the root `.env` file in the same directory and uses it to interpolate `${VARIABLE_NAME}` tokens.
* **Container Isolation**: Docker does **not** blindly copy every variable from the host `.env` into container memory. Variables are only passed into a container if explicitly declared under that service's `environment:` block:

```yaml
services:
  backend-java:
    container_name: crm-backend-java
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/${POSTGRES_DB}
      SPRING_DATASOURCE_USERNAME: ${POSTGRES_USER}
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SECRET: ${JAVA_JWT_SECRET}
      AWS_REGION: ${AWS_REGION}
      AWS_S3_ENDPOINT: http://localstack:4566
      AWS_S3_BUCKET: ${AWS_S3_BUCKET}
      GEMINI_API_KEY: ${GEMINI_API_KEY:-}   # <-- Forwarded from host .env

  backend-nodejs:
    container_name: crm-backend-nodejs
    environment:
      PORT: 5000
      NODE_ENV: production
      MONGO_URI: mongodb://mongodb:27017/${MONGO_INITDB_DATABASE}
      JWT_SECRET: ${NODE_JWT_SECRET}
      JWT_EXPIRY: ${JWT_EXPIRY}
      REFRESH_TOKEN_EXPIRY: ${REFRESH_TOKEN_EXPIRY}
      GEMINI_API_KEY: ${GEMINI_API_KEY:-}   # <-- Forwarded from host .env
```
* **Fallback Safety**: Using `${VAR:-}` ensures that if a developer has not set an optional key, Docker Compose supplies an empty string rather than crashing container orchestration.

#### Stage 3: Runtime Resolution in Application Code

##### A. Java Spring Boot (`backend-java`)
1. **Container OS Environment**: When Docker boots the Linux container, the variables in `environment:` become standard OS environment variables accessible via `System.getenv(...)`.
2. **Property Placeholder Resolution**: Spring Boot reads `src/main/resources/application.yml`:
   ```yaml
   gemini:
     api-key: ${GEMINI_API_KEY:}
     embedding-model: ${GEMINI_EMBEDDING_MODEL:text-embedding-004}
     generation-model: ${GEMINI_GENERATION_MODEL:gemini-2.0-flash}
   ```
   Spring's `PropertySourcesPlaceholderConfigurer` checks the container OS environment and binds the value to `${GEMINI_API_KEY:}`.
3. **Relaxed Binding**: Spring Boot automatically maps uppercase underscored OS environment variables to dotted properties (e.g., `GEMINI_API_KEY` maps to `gemini.api-key`).
4. **Resilient Local Fallback**: The trailing colon `:` provides an empty default string (`""`), preventing missing property exceptions during offline tests or CI/CD builds without an active API key.

##### B. Node.js Express (`backend-nodejs`)
1. **Container OS Environment**: In the containerized Node.js runtime, all variables defined in `environment:` are immediately populated into the global `process.env` object.
2. **Direct Memory Access**: Application modules access configuration directly with zero reflection or annotation overhead:
   ```typescript
   const geminiApiKey = process.env.GEMINI_API_KEY || '';
   const jwtSecret = process.env.JWT_SECRET;
   ```
3. **Non-Docker Local Development**: When executed locally via `npm run dev` outside Docker, `dotenv` loads the root `.env` into `process.env` before server initialization.

---

## 3. Java Spring Boot on Render Configuration

Render’s free tier provides 512 MB of total RAM. Because standard JVMs attempt to allocate up to 25–50% of host RAM without container awareness, Spring Boot must be restricted via JVM flags.

### Required Environment Variable (Render Dashboard)
```bash
JAVA_TOOL_OPTIONS="-Xmx300m -Xms128m -Xss512k -XX:+UseSerialGC"
```

- `-Xmx300m`: Caps the maximum heap memory at 300 MB, leaving ~200 MB for metaspace, thread stacks, and OS overhead.
- `-Xss512k`: Reduces per-thread stack size from 1 MB to 512 KB to reduce memory footprint.
- `-XX:+UseSerialGC`: Lowers memory overhead of garbage collection threads in single-core/low-RAM containers.

### Connecting to Neon PostgreSQL
In `application.properties` (or as Render environment variables):
```properties
spring.datasource.url=jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require
spring.datasource.username=${DB_USER}
spring.datasource.password=${DB_PASSWORD}
spring.datasource.driver-class-name=org.postgresql.Driver

# Connection Pool optimizations for serverless/free tiers
spring.datasource.hikari.maximum-pool-size=5
spring.datasource.hikari.minimum-idle=1
spring.datasource.hikari.idle-timeout=30000
spring.datasource.hikari.max-lifetime=60000
```

---

## 4. Node.js + Express on Render Configuration

### Environment Variables
```bash
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://${MONGO_USER}:${MONGO_PASS}@cluster0.mongodb.net/crm?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=https://your-frontend.vercel.app
```

### Build & Start Commands
- **Build Command**: `npm install && npm run build` (if using TypeScript)
- **Start Command**: `node dist/server.js` (or `node server.js`)

---

## 5. Observability, OpenTelemetry & Logging Pipeline

The CRM includes a production-grade observability and telemetry pipeline integrated into `docker-compose.yml` to support standard runtime monitoring alongside AI-native RAG and Agentic metrics.

### Observability Standards Matrix

| Capability | Node.js / Express (`backend-nodejs`) | Java / Spring Boot (`backend-java`) |
| :--- | :--- | :--- |
| **Application Logger** | `Pino` (structured JSON, PII-redacted paths) | `SLF4J` + `Logback` (via Lombok `@Slf4j`) |
| **HTTP Request Logging** | `pino-http` (bypasses `/health` & `/metrics`) | `CommonsRequestLoggingFilter` / Actuator HTTP trace |
| **Distributed Tracing & Telemetry** | OpenTelemetry SDK instrumentation (`@opentelemetry/sdk-node`) | Micrometer Tracing with OpenTelemetry bridge |
| **Metrics Scrape Endpoint** | `GET /nodejs-wtc-api/v1/metrics` (`prom-client`) | `GET /actuator/prometheus` (Micrometer Prometheus Registry) |
| **Log Shipper & Ingestion** | Promtail (`/var/run/docker.sock`) $\rightarrow$ Grafana Loki | Promtail (`/var/run/docker.sock`) $\rightarrow$ Grafana Loki |
| **Visualization & Dashboards** | Grafana (Auto-provisioned datasources) | Grafana (Auto-provisioned datasources) |

### Configured Running Servers & Services (`docker-compose.yml`)

The following observability servers are configured and runnable via Docker Compose:

1. **Prometheus (`crm-prometheus` on port `9090`)**:
   - Configuration: `monitoring/prometheus/prometheus.yml`
   - Scrapes `localhost:9090` (self), `backend-nodejs:5000/nodejs-wtc-api/v1/metrics`, and `backend-java:8080/actuator/prometheus` at 5-second intervals.
   - Web UI available at: `http://localhost:9090`.

2. **Grafana (`crm-grafana` on port `3001`)**:
   - Configuration: `monitoring/grafana/provisioning/datasources/datasources.yml`
   - Pre-configured with Prometheus as default time-series datasource and Loki as centralized log viewer.
   - Web UI available at: `http://localhost:3001` (Default credentials: `admin` / `admin`).

3. **Loki (`crm-loki` on port `3100`)**:
   - Configuration: `monitoring/loki/loki-config.yml`
   - High-efficiency log aggregation engine using TSDB schema and filesystem chunk storage.

4. **Promtail (`crm-promtail`)**:
   - Configuration: `monitoring/promtail/promtail-config.yml`
   - Discovers Docker container standard output via host socket `/var/run/docker.sock`, attaches container labels (`container=crm-backend-nodejs`, `container=crm-backend-java`), and ships streams to Loki.

### Custom RAG & Agentic Telemetry Metrics

The CRM links RAG and evaluation benchmark metrics directly to the telemetry stack (`MeterRegistry` $\rightarrow$ Prometheus $\rightarrow$ Grafana) across both backend implementations:

#### 1. Java / Spring Boot Telemetry Linkage (`backend-java`)
* **Instrumentation (`RagEvaluationTelemetryService`)**: Registers gauges, distribution summaries, counters, and timers directly into Micrometer's `MeterRegistry`.
* **Actuator Scrape Pipeline**: Spring Boot Actuator exposes these meters in Prometheus exposition format at `GET /actuator/prometheus` (configured in `application.yml` under `management.endpoints.web.exposure.include: health,info,prometheus`).
* **Prometheus Scraping**: The Prometheus container (`crm-prometheus` configured in `monitoring/prometheus/prometheus.yml`) polls `backend-java:8080/actuator/prometheus` on a 5-second interval.
* **Evaluator & Benchmark Hook**: As unit or integration benchmarks execute (e.g. `FactCheckingEvaluator`, `RelevancyEvaluator`, `RagRetrievalBenchmarkTest`), scores, latencies, and pass/fail verdicts are published to the telemetry service in real time.

#### 2. Exposed AI & RAG Metrics Schema
- `rag_retrieval_duration_seconds`: Histogram tracking hybrid search latency across vector and keyword indexes.
- `rag_similarity_score`: Histogram capturing cosine similarity distribution of retrieved document chunks.
- `rag_eval_faithfulness_score`: Gauge (0.0 - 1.0) assessing factual grounding against retrieved document context (zero hallucination).
- `rag_eval_relevancy_score`: Gauge (0.0 - 1.0) assessing semantic alignment to user queries.
- `rag_eval_ir_recall`: Gauge tracking Candidate-Grounded Recall@K metric across benchmark evaluation.
- `rag_eval_ir_ndcg`: Gauge tracking Normalized Discounted Cumulative Gain (NDCG@K).
- `rag_eval_ir_mrr`: Gauge tracking Mean Reciprocal Rank (MRR).
- `rag_eval_runs_total`: Counter recording evaluation runs tagged by evaluator, judge type, and verdict (`pass`/`fail`).
- `rag_eval_duration_seconds`: Histogram measuring evaluation execution latency.
- `llm_tokens_total`: Counter tracking prompt and completion tokens per model and agent.
- `agent_tool_calls_total`: Counter recording tool invocations by agent, tool name, and success/error status.
- `agent_execution_iterations`: Histogram measuring reasoning-action loop iterations per agent goal.

### Running the Monitoring Stack

To start the observability pipeline independently:
```bash
docker compose up -d prometheus grafana loki promtail
```

---

## 6. API Documentation (Swagger / OpenAPI)


### Spring Boot
Add the SpringDoc OpenAPI starter dependency:
```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.8.5</version>
</dependency>
```
Access at: `http://<host>/swagger-ui/index.html`

### Express
Use `swagger-ui-express` + `swagger-jsdoc` (or `@scalar/express-api-reference`):
```javascript
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json';

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
```
Access at: `http://<host>/api-docs`

Access creds:
- Work Email: admin@wealthtech.com
- Password: Admin@123
