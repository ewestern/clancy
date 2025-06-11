---

## Design Doc — **ConnectHub**

*"Unified integration, token, and proxy layer for Clancy Digital-Employees"*
**Status:** Draft v0.4 · **Authors:** ChatGPT + Peter · **Last updated:** 2025-01-01

### Technology Stack

* **Runtime**: Node.js  
* **Framework**: Fastify with TypeBox type provider
* **Language**: TypeScript (strict mode)
* **Database**: PostgreSQL with Drizzle ORM
* **Authentication**: Auth0 M2M tokens + JWT validation
* **API Documentation**: Auto-generated OpenAPI 3.0 via @fastify/swagger
* **Testing**: Vitest for unit and integration tests
* **Monitoring**: Structured logging + Prometheus metrics

### 1 Purpose & Scope

ConnectHub is a single service that:

1. **Stores & refreshes** third-party OAuth credentials for each tenant.
2. **Maps** Clancy's internal scopes (e.g., `invoice.write`) to provider scopes.
3. **Proxies** all outbound API calls so worker containers never touch raw tokens or provider SDKs.
4. **Publishes** an Integration Catalog consumed by the LLM compiler and UI wizard.

> **MVP target:** Slack, QuickBooks, Gmail; throughput ≈ 50 req/s; latency budget < 500 ms P95.


### 2 High-Level Architecture

```
                               ┌────────────┐
                               │   Workers  │  (LangGraph nodes)
                               └─────▲──────┘
                                     │ 1. POST /proxy/{action}
                                     │    Auth0 JWT + params
                     ┌────────────────┴──────────────────┐
                     │          ConnectHub               │
                     │         (Node.js + Fastify)       │
                     │───────────────────────────────────│
                     │  REST API  (/oauth, /proxy)       │
                     │  Auth0 JWT Validation             │
                     │  AdapterRouter (internal_action→) │
                     │  TokenStore   (Drizzle ORM)       │
                     │  ProviderAdapters (Slack, QB…)    │
                     │  ErrorHandler & Metrics           │
                     └────────────────┬──────────────────┘
                                      │ 2. HTTPS call
                                      ▼
                              SaaS Provider API
```

*Execution flow*

1. Worker needs `invoice.write` → calls `/proxy/invoice.write` with Auth0 M2M token.
2. ConnectHub validates Auth0 JWT, checks internal scope, fetches/refreshes provider token.
3. Adapter translates params→provider request, executes API call, normalizes response.
4. Response/error bubbled back to worker; structured logs and metrics emitted.

---

### 3 Key Components

| Component           | Responsibility                                             | Notes                                                   |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| **REST API**        | Exposes `/oauth/complete`, `/proxy/*`, `/catalog`.         | Node.js + Fastify + TypeBox schemas.                   |
| **TokenStore**      | `org_id, connection_id, refresh_token, provider_scopes[]`. | Drizzle ORM + PostgreSQL; AES-GCM encryption.           |
| **ScopeMapper**     | TypeScript objects translating internal↔provider scopes.   | Type-safe; validated at build time.                     |
| **Auth0 Integration** | Validates M2M tokens, manages service authentication.    | Leverages Auth0 Token Vault for select providers.       |
| **AdapterRouter**   | Dispatch table `internal_action → adapter class`.          | New adapters are TypeScript modules.                    |
| **ProviderAdapter** | Param transform, API call, response normalize.             | Retry + exponential backoff; surface rate-limit header. |
| **ErrorHandler**    | Canonical codes `RATE_LIMIT`, `AUTH_ERROR`, `BAD_PARAMS`.  | TypeBox error schemas; structured logging.              |
| **Metrics/Logs**    | Latency, call count, bytes, provider 4xx/5xx.              | Fastify structured logging + Prometheus metrics.        |

---

### 4 Primary APIs (v0)

| Endpoint                                          | Verb | Payload → Result                                                                     |          |
| ------------------------------------------------- | ---- | ------------------------------------------------------------------------------------ | -------- |
| `/oauth/complete`                                 | POST | `{org_id, connection_id, auth_code}` → 201 Created                                   |          |
| `/credential` *(may be deprecated if proxy only)* | POST | `{org_id, connection_id, internal_scopes[]}` → `{jwt}`                               |          |
| `/proxy/{internal_action}`                        | POST | `{org_id, params, correlation_id}` + `Authorization: Bearer <jwt>` → \`{status, data | error}\` |
| `/catalog`                                        | GET  | → `[ {connection, actions[], description} ]` (public)                                |          |

---

### 5 Data Persistence

* **PostgreSQL** (single-AZ to start) with **Drizzle ORM** for type-safe database operations.
* **Schema-first approach** with generated TypeScript types from database models.
* **AES-GCM encryption** for `refresh_token` column using KMS keys.
* **Database migrations** managed via Drizzle migration system.
* **S3** for adapter config blobs / icons (future enhancement).

Migration path: shard token table by tenant or leverage Auth0 Token Vault as scale grows.

---

### 6 Security & Compliance

* **Zero raw provider tokens** leave ConnectHub.
* **Auth0 M2M token validation** on every request with proper scope checking.
* **Provider token scopes** must be subset of requested internal scopes.
* **mTLS between workers↔ConnectHub** (service-mesh).
* **Structured audit logging** of every proxy call with request/response hashing.
* **TypeScript type safety** prevents many security vulnerabilities at compile time.
* **SOC 2 Type II attestation**—ConnectHub logs feed into central evidence store.

---

### 7 Scalability Plan

| Layer       | MVP                         | ≥ 1 k rps                                 |
| ----------- | --------------------------- | ----------------------------------------- |
| Ingress     | ALB → ECS service (2 tasks) | AutoScale on CPU + queue depth            |
| Adapters    | In-process                  | Break out heavy adapters to micro-proxies |
| Tokens      | Single Postgres             | RDS Multi-AZ, then Aurora Srv-less        |
| Rate-limits | Provider headers            | Central quota cache (Redis)               |

---

### 8 Open Questions

1. **Presigned upload flow** — do we need a generic file pass-through adapter?
2. **Non-OAuth creds** — where do SMTP passwords live? integrate into same TokenStore?
3. **On-prem demand** — earliest milestone for a self-hosted TokenStore?
4. **Streaming APIs** (e.g., Slack RTM) — can proxy model handle websockets or do we need sidecar connectors?

---

### 9 Next Steps


1. **Scaffold Node.js + Fastify application** following clancy-patterns.
2. **Implement Drizzle ORM models** for TokenStore, connections, and scope mappings.
3. **Prototype `/proxy/slack.post` + `/proxy/invoice.write` adapters** with TypeScript.
4. **Implement Auth0 M2M token validation** and scope checking middleware.
5. **Build unit & integration tests** using Vitest around ScopeMapper validation.
6. **Benchmark proxy round-trip** vs. direct SDK call to ensure < 50 ms overhead.
7. **Draft threat model & key rotation SOP** with TypeScript type safety considerations.

---