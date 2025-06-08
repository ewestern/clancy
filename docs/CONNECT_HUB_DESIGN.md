---

## Design Doc — **ConnectHub**

*"Unified integration, token, and proxy layer for Clancy Digital-Employees"*
**Status:** Draft v0.5 · **Authors:** ChatGPT + Peter · **Last updated:** 2025-06-14

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
2. **Maps** internal scopes (e.g., `invoice.write`) to provider scopes.
3. **Proxies** outbound API calls so workers never touch raw tokens or provider SDKs.
4. **Publishes** a Capability Catalog (`/capabilities`) plus versioned prompts (`/prompt/*`) for graph creators.

> **MVP target:** Slack, QuickBooks, Gmail; throughput ≈ 50 req/s; latency budget < 500 ms P95.


### 2 High-Level Architecture

```
                               ┌────────────┐
                               │   Workers  │  (LangGraph nodes)
                               └─────▲──────┘
                                     │ 1. POST /action/{action}
                                     │    Auth0 JWT + params
                     ┌────────────────┴──────────────────┐
                     │          ConnectHub               │
                     │         (Node.js + Fastify)       │
                     │───────────────────────────────────│
                     │  REST API  (/oauth, /action)      │
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

1. Worker needs `invoice.write` → calls `/action/invoice.write` with Auth0 M2M token.
2. ConnectHub validates Auth0 JWT, checks internal scope, fetches/refreshes provider token.
3. Adapter translates params→provider request, executes API call, normalizes response.
4. Response/error bubbled back to worker; structured logs and metrics emitted.

---

### 3 Key Components

| Component           | Responsibility                                             | Notes                                                   |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| **REST API**        | Exposes `/oauth/complete`, `/proxy/*`, `/capabilities`, `/prompt/*`. | Node.js + Fastify + TypeBox schemas. |
| **TokenStore**      | `org_id, connection_id, refresh_token, provider_scopes[]`. | Drizzle ORM + PostgreSQL; AES-GCM encryption.           |
| **ScopeMapper**     | TypeScript objects translating internal↔provider scopes.   | Type-safe; validated at build time.                     |
| **Auth0 Integration** | Validates M2M tokens, manages service authentication.    | Leverages Auth0 Token Vault for select providers.       |
| **CapabilityRouter**| Dispatch table `provider/capability` → capability handler. | Lazy-loads providers; caching built-in. |
| **ProviderRuntime** | Encapsulates metadata + list of capabilities, OAuth methods. | Full OAuth lifecycle management for external providers. |
| **ErrorHandler**    | Canonical codes `RATE_LIMIT`, `AUTH_ERROR`, `BAD_PARAMS`.  | TypeBox error schemas; structured logging.              |
| **Metrics/Logs**    | Latency, call count, bytes, provider 4xx/5xx.              | Fastify structured logging + Prometheus metrics.        |

---

### 4 Primary APIs (current)

| Endpoint                                          | Verb | Payload → Result                                                                     | Notes |
| ------------------------------------------------- | ---- | ------------------------------------------------------------------------------------ | ----- |
| `/oauth/complete`                                 | POST | `{org_id, connection_id, auth_code}` → 201 Created                                   | Legacy webhook completion (to be replaced by /oauth/callback) |
| `/oauth/needs`                                    | GET  | `?org_id` `&graph_id` → `[ {provider,status,missingScopes,authUrlTemplate} ]`         | Determines scope gaps before running a graph |
| `/oauth/launch`                                   | GET  | query: `org_id, provider, scopes[], redirect_uri` → 302 to provider auth URL         | Generic launch handler |
| `/oauth/callback/{provider}`                      | GET  | Provider-specific query params → 302 back to UI                                       | Delegates to ProviderRuntime.handleCallback |
| `/proxy/{provider}/{capability}`                  | POST | `{params}` + `Authorization: Bearer <jwt>` → `{status,data,error}` | Executes capability |
| `/capabilities`                                   | GET  | → `[ {provider, capabilities[], metadata} ]` (public)                                 | Capability catalog |
| `/prompt/{provider}/{capability}/{version}`       | GET  | → `{system,user,fewShot,modelHint}`                                                  | Returns prompt text |

---

### 5 OAuth Flow (generic)

```
GET  /oauth/needs?org_id=123&graph_id=g1
      ↓ (detects slack files:write missing)
GET  /oauth/launch?...               --302→ slack.com/oauth/…
User consent ➜ redirect /oauth/callback/slack?code=…&state=…
      ↓ handleCallback()
UPSERT connections
UPDATE oauth_transactions (completed)
```

ProviderRuntime introspection:
```ts
generateAuthUrl({ orgId, scopes, redirectUri, state }): string;
handleCallback(query, ctx): Promise<TokenResult>; // exchanges code for tokens
refreshToken(refreshToken, ctx): Promise<TokenResult>; // refreshes expired tokens
mapInternalScopes(internalScopes): string[]; // maps Clancy scopes to provider scopes
validateScopes(required, granted): ScopeValidationResult; // validates scope sufficiency
isTokenValid(accessToken): Promise<boolean>; // checks token validity
```

### Provider Architecture Patterns

#### Multi-Service Providers
For providers with multiple services (e.g., Google with Gmail + Calendar), we use a modular approach:

```
connect_hub/src/integrations/
├── google.ts                    # Main provider with OAuth methods
└── google/
    ├── gmail.ts                 # Gmail-specific capabilities
    ├── calendar.ts              # Calendar-specific capabilities
    └── prompts/
        ├── gmail.send-1.0.0.yaml
        └── calendar.event.create-1.0.0.yaml
```

#### Service Modules
Each service module exports:
- TypeBox schemas for parameters and results
- Capability implementation functions
- Service-specific client creation logic

#### OAuth Implementation
External providers implement full OAuth lifecycle:
- Authorization URL generation with PKCE support
- Authorization code exchange for tokens
- Token refresh handling
- Scope mapping between internal and provider scopes
- Token validation and expiration checks

### 6 Data Persistence

* **connections** — steady-state credentials per `(org_id, provider)`
  * `access_token`, `refresh_token`, `granted_scopes[]`, `expires_at`, `status`
* **oauth_transactions** — transient consent handshakes
  * `txn_id`, `org_id`, `provider`, `requested_scopes[]`, `state`, `code_verifier`, `redirect_uri`, `status`, `created_at`, `finished_at`

Cleanup job removes finished transactions after 30 days.

---

### 7 Security & Compliance

* **Zero raw provider tokens** leave ConnectHub.
* **Auth0 M2M token validation** on every request with proper scope checking.
* **Provider token scopes** must be subset of requested internal scopes.
* **mTLS between workers↔ConnectHub** (service-mesh).
* **Structured audit logging** of every proxy call with request/response hashing.
* **TypeScript type safety** prevents many security vulnerabilities at compile time.
* **SOC 2 Type II attestation**—ConnectHub logs feed into central evidence store.

---

### 8 Scalability Plan

| Layer       | MVP                         | ≥ 1 k rps                                 |
| ----------- | --------------------------- | ----------------------------------------- |
| Ingress     | ALB → ECS service (2 tasks) | AutoScale on CPU + queue depth            |
| Adapters    | In-process                  | Break out heavy adapters to micro-proxies |
| Tokens      | Single Postgres             | RDS Multi-AZ, then Aurora Srv-less        |
| Rate-limits | Provider headers            | Central quota cache (Redis)               |

---

### 9 Open Questions (trimmed)

1. **Websocket / streaming APIs** — handle via sidecar or SSE in proxy?
2. **Presigned uploads** — generic passthrough or provider-specific?
3. **Prompt A/B testing** — rollout strategy for new `promptVersions`.
4. **Token Vault adoption timeline** — when to migrate to Auth0 Token Vault for Slack/Gmail.

---

### 10 Next Steps

1. ✅ **Completed**: Expand provider set using new `ProviderRuntime` contract (Google implemented)
2. ✅ **Completed**: Implement `/proxy/*` execution pipeline with capability routing
3. ✅ **Completed**: Multi-service provider pattern (Google with Gmail + Calendar)
4. ✅ **Completed**: Full OAuth lifecycle implementation with token management
5. **In Progress**: Finish TokenStore schema + Drizzle migrations
6. **Planned**: Add `/connection-status` endpoint to surface `NEEDS_SCOPE_UPGRADE` cases
7. **Planned**: Integrate Auth0 M2M validation middleware
8. **Planned**: Build comprehensive unit & integration tests around OAuth flows
9. **Planned**: Add retry + metrics to proxy execution pipeline
10. **Planned**: Draft threat model & key rotation SOP

### Current Implementation Status
- **Google Provider**: Fully implemented with Gmail and Calendar services
- **Proxy Routes**: Dynamic route generation based on provider capabilities
- **OAuth Flow**: Complete implementation with authorization, callback, and refresh
- **Scope Mapping**: Internal to provider scope translation
- **Service Modules**: Modular capability organization pattern established

---