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

In addition to default OS and HTTP request duration histograms (`http_request_duration_seconds`), `backend-nodejs/src/common/metrics/metrics.ts` exposes custom AI-native metrics:
- `rag_retrieval_duration_seconds`: Histogram tracking hybrid search latency across vector and keyword indexes.
- `rag_similarity_score`: Histogram capturing cosine similarity distribution of retrieved document chunks.
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
