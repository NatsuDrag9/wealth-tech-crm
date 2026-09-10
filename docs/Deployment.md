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

## 5. Observability & Logging Standards

| Feature | Node.js / Express | Java / Spring Boot |
| :--- | :--- | :--- |
| **Application Logger** | `Pino` (structured JSON, high-speed) or `Winston` | `SLF4J` + `Logback` (via Lombok `@Slf4j`) |
| **HTTP Request Logging** | `pino-http` or `morgan` | `CommonsRequestLoggingFilter` or custom servlet filter |
| **Centralized Log Aggregation** | Ship stdout JSON $\rightarrow$ **Grafana Loki** or Datadog | Ship stdout JSON $\rightarrow$ **Grafana Loki** or Datadog |
| **Metrics & Health** | `prom-client` $\rightarrow$ Prometheus / Grafana | `spring-boot-starter-actuator` $\rightarrow$ Prometheus |

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
