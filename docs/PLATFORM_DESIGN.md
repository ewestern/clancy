# Clancy Platform Architecture

## Overview

The Clancy platform consists of three core services that work together to provide intelligent agent orchestration for organizations:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Clancy Platform                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐         Auth0 (External)   │
│  │ Agent-Core  │    │ ConnectHub  │         ├── User Auth      │
│  │ (Control    │    │(Integration │         ├── Agent Auth     │
│  │  Plane)     │    │   Layer)    │         ├── Token Mgmt     │
│  └─────────────┘    └─────────────┘         └── Permissions    │
│         │                   ▲                                    │
│         │                   │                                    │
│         ▼                   │                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Event Bus                               │  │
│  │               (Message Queue)                              │  │
│  └───────────────────────────────────────────────────────────┐  │
│                              │                                │  │
│                              ▼                                │  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 Agent Workers                              │  │
│  │              (Graph Execution)                             │  │
│  └───────────────────────────────────────────────────────────┐  │
└─────────────────────────────────────────────────────────────────┘
```

## Service Responsibilities

### 1. Agent-Core (Control Plane)
**Tech Stack**: Node.js + Fastify + Drizzle ORM + PostgreSQL

**Primary Responsibilities**:
- 🧠 **Hierarchical Graph Creation**: Generate "AI Employee" graphs from job descriptions
- 👥 **Employee Registry**: Manage persistent ai employee identities and skill compositions
- 🎛️ **Supervisor Logic**: Route triggers to appropriate employees and skill nodes
- 💾 **Memory Management**: Maintain unified context across employee, skill, and organizational layers
- 📤 **Intent Emission**: Publish `runIntent` events with hierarchical context to execution queue

**What it does NOT do**:
- Execute hierarchical graphs (delegates to agent workers)
- Implement capabilities (uses ConnectHub)
- Handle authentication (delegates to Clerk & AWS Cognito)

### 2. ConnectHub (Integration Layer)
**Tech Stack**: Node.js + Fastify + Drizzle ORM + PostgreSQL + TypeScript

**Primary Responsibilities**:
- 🔌 **Integration Catalog**: Maintain catalog of available integrations and actions
- 🌐 **OAuth Management**: Handle OAuth flows and credential storage
- 🔑 **Token Management**: Store and refresh third-party tokens (leverages Auth0 Token Vault where available)
- 🔄 **API Proxy**: Execute capability requests on behalf of agents
- 🛡️ **Rate Limiting**: Manage API quotas and request throttling
- 🔐 **Secure Proxy**: Zero raw tokens exposed to workers

**API Surface**:
- `GET /health` - Comprehensive service health check
- `GET /capabilities` - List available integrations and their capabilities
- `GET /oauth/launch/:provider` - Initiate OAuth flow for a specific provider
- `GET /oauth/callback/:provider` - Handle OAuth callback and token exchange
- `POST /proxy/:providerId/:capabilityId` - Execute a provider capability via secure proxy

### 3. Agent Workers (Graph Execution)
**Tech Stack**: Node.js + LangGraph (TypeScript) + AWS Lambda (SAM)

**Primary Responsibilities**:
- 🚀 **Hierarchical Graph Execution**: Run employee supervisor graphs with nested skill graphs
- 💾 **State Management**: Handle LangGraph checkpointing across skill and micro-agent layers
- 🔗 **Capability Integration**: Call ConnectHub for capability execution with hierarchical context
- 📡 **Event Emission**: Publish execution events with hierarchical run_id correlation
- 🔐 **Secure Execution**: Authenticate with AWS Cognito JWTs (M2M)

**Event Consumption**:
- Subscribes to `runIntent` events from Agent-Core
- Publishes `executionResult` and `agentEvent` events

### 4. Clerk (User & Organization Identity)

**Responsibilities**:
 - 👤 **User Authentication**: Universal login, session management, passwordless/email magic links
 - 🏢 **Organization Management**: Built-in multi-tenant support (Clerk Organizations)
 - 🔑 **JWT Issuance**: Short-lived JWTs (15 min) embedding `org_id`, `user_id`, and role claims
 - 📊 **Audit Logging**: Centralized auth logs & webhooks to Agent-Core for security analytics

### 5. AWS Cognito (Machine-to-Machine Authentication)

**Responsibilities**:
 - 🤖 **M2M Tokens**: Issue and validate JWTs for service & agent workloads
 - 🔐 **Scoped Credentials**: Separate user pool app clients for Agent-Core, ConnectHub, Event Bus, etc.
 - 🏷️ **Fine-grained Claims**: Custom claims for `capability_scope`, `org_id`, `agent_id`
 - 🔄 **Token Rotation**: Automatic refresh via AWS SDK providers; <1 hour expiry
 - 📜 **Policy Enforcement**: API Gateway & Lambda authorisers validate Cognito JWTs

## Data Flow

### 1. Hierarchical Graph Creation Flow
```
User Request (with Clerk JWT)
    ↓
Agent-Core (validate JWT, parse job description into skills)
    ↓
ConnectHub (query available capabilities for skill templates)
    ↓
Agent-Core (assemble employee graph & save to registry)
    ↓
FactStream (emit GraphDefined event)
    ↓
Response (EmployeeGraphSpec)
```

### 2. Hierarchical Employee Execution Flow
```
Trigger (Slack, webhook, schedule)
    ↓
Agent-Core (supervisor routes to ai employees)
    ↓
Event Bus (runIntent event with hierarchical context)
    ↓
Agent Worker (compile supervisor graph, execute skill nodes)
    ↓
  ├─ Skill Graph A (micro-agents in-process)
  ├─ Skill Graph B (micro-agents in-process)  
  └─ Each skill calls ConnectHub (proxy capability with Cognito M2M token)
    ↓
External Providers (execute actions)
    ↓
Agent Worker (complete hierarchical execution)
    ↓
Event Bus (executionResult event with skillsExecuted + hierarchical run_id)
    ↓
Agent-Core (update employee memory with skill-level context)
```

## Event Schema

### runIntent Event
```json
{
    "event_id": "uuid",
    "type": "runIntent", 
    "org_id": "string",
    "employee_id": "string",
    "execution_id": "string",
    "run_id": "emp:42_v3:2025-06-09T18:00Z",
    "auth_context": {
        "clerk_org_id": "org_xxx",
        "employee_m2m_app_id": "string"
    },
    "trigger": {
        "type": "direct_command|schedule|external_event|internal_event",
        "payload": {},
        "source": "string"
    },
    "context": {
        "employee_memory": {},
        "skill_contexts": {},
        "org_knowledge": {},
        "execution_state": {}
    },
    "graph_spec": {
        "graph_id": "emp_42_v3",
        "type": "employee",
        "nodes": [
            {
                "id": "skill_invoices",
                "type": "skill", 
                "skill_graph": "sg_inv_v1",
                "permissions": ["invoice.write", "slack.read"]
            }
        ],
        "edges": [...]
    },
    "timestamp": "ISO8601"
}
```

### executionResult Event
```json
{
    "event_id": "uuid",
    "type": "executionResult",
    "org_id": "string", 
    "employee_id": "string",
    "execution_id": "string",
    "run_id": "emp:42_v3:2025-06-09T18:00Z",
    "status": "completed|failed|interrupted",
    "result": {},
    "error": "string?",
    "skills_executed": ["skill_invoices", "skill_updates"],
    "execution_time_ms": "number",
    "capabilities_used": ["slack.post", "invoice.create"],
    "hierarchical_events": [
        {
            "run_id": "emp:42_v3:2025-06-09T18:00Z:skill:skill_invoices",
            "status": "completed",
            "micro_agents": ["n1", "n2", "n3"]
        }
    ],
    "timestamp": "ISO8601"
}
```

## Authentication Strategy

### User Authentication (Clerk)
- End-users and managers sign in via Clerk Universal Login  
- Clerk issues 15-minute JWTs containing `user_id`, `org_id`, and role claims  
- Refresh tokens handled client-side via Clerk SDK; no long-lived cookies  

### Agent / Service Authentication (AWS Cognito)
- Each AI employee and internal service receives a dedicated Cognito app-client ID  
- Cognito issues JWTs (up to 60 min) with custom claims: `agent_id`, `org_id`, `capability_scope`  
- Tokens are obtained via the service’s IAM-secured secret or SRP flow and injected into HTTP headers  

### Token Validation & Propagation
- API Gateway/Lambda authorisers validate Cognito JWTs  
- Fastify middleware validates Clerk or Cognito tokens depending on route type  
- Downstream services propagate the original JWT via `Authorization: Bearer` header to maintain traceability

## Scaling Characteristics

### Agent-Core
- **Scaling**: Horizontal (stateless control plane)
- **Bottlenecks**: Database queries for agent registry/memory
- **Optimization**: Read replicas, caching

### ConnectHub
- **Scaling**: Horizontal (API gateway pattern)
- **Bottlenecks**: Third-party API rate limits, token refresh operations
- **Optimization**: Connection pooling, circuit breakers, token caching

### Agent Workers
- **Scaling**: Horizontal (queue consumers)
- **Bottlenecks**: Hierarchical graph compilation, nested skill execution, capability calls
- **Optimization**: Worker pools, execution timeouts, skill-level parallelization

### Clerk
- **Scaling**: SaaS-hosted; horizontal scaling managed by Clerk  
- **Considerations**: User/org limits, webhook delivery latency  

### Cognito
- **Scaling**: Fully managed; high concurrency for token issuance  
- **Considerations**: App-client quotas, JWT size limits; cold-start costs for Lambda authorisers

## Development Phases

### Phase 1: MVP
- **Agent-Core**: Basic graph creation + supervisor logic
- **ConnectHub**: OAuth flows for Slack, QuickBooks, Gmail
- **Agent Workers**: Basic LangGraph execution
- **Auth0**: Basic organization setup, M2M apps for agents

### Phase 2: Production Ready
- **Agent-Core**: Advanced memory system, optimization
- **ConnectHub**: More integrations, Auth0 Token Vault integration
- **Agent Workers**: Fault tolerance, monitoring
- **Auth0**: Fine-grained permissions, Auth0 Actions for custom logic

### Phase 3: Scale
- **Multi-region deployment**
- **Advanced orchestration patterns**
- **ML-powered agent optimization**
- **Enterprise features (SSO, advanced RBAC)**

## Service Communication

### Synchronous (HTTP)
- Agent-Core → ConnectHub (capability queries)
- Agent Workers → ConnectHub (capability execution)
- All services → API Gateway authorisers / Fastify middleware → Clerk or Cognito (token validation)

### Asynchronous (Event Bus)
- Agent-Core → Agent Workers (runIntent events)
- Agent Workers → Agent-Core (execution results)
- All services → Event Bus (audit events)

This architecture now leverages Clerk for human identity and AWS Cognito for machine identity, giving us a clear separation between interactive users and automated workloads while remaining cloud-native to AWS.

## Future Authentication Enhancements

1. 🔐 **Zero-Trust Service Mesh** – Introduce mTLS between internal services (e.g., AWS App Mesh or Linkerd) so that even internal traffic is mutually authenticated in addition to JWTs.  
2. 🔏 **Fine-Grained Capability Scopes** – Expand Cognito custom scopes to align 1-to-1 with ConnectHub capability IDs, enabling least-privilege execution at skill level.  
3. 📜 **Signed Webhooks** – Replace simple bearer tokens with HMAC-signed webhook payloads (Clerk session keys or AWS SigV4) to prevent replay attacks.  
4. 🕵️ **Centralised Audit & SIEM** – Stream Clerk and Cognito logs into AWS Security Lake and Datadog to enable real-time anomaly detection.  
5. 🔄 **Shorter-Lived Tokens + Automatic Rotation** – Reduce Cognito token TTL to 15 min and implement proactive refresh in Agent-Workers to tighten blast radius.  
6. 🧩 **SSO & Social Providers** – Leverage Clerk’s built-in SSO (SAML, OIDC) to support enterprise identity providers without custom code.  
7. 🛡️ **Advanced RBAC** – Layer AWS IAM policies on API Gateway stages to enforce organisation-level quotas combined with Clerk role claims. 