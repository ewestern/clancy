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
- 🧠 **Hierarchical Graph Creation**: Generate "Digital Employee" graphs from job descriptions
- 👥 **Employee Registry**: Manage persistent digital employee identities and skill compositions
- 🎛️ **Supervisor Logic**: Route triggers to appropriate employees and skill nodes
- 💾 **Memory Management**: Maintain unified context across employee, skill, and organizational layers
- 📤 **Intent Emission**: Publish `runIntent` events with hierarchical context to execution queue

**What it does NOT do**:
- Execute hierarchical graphs (delegates to agent workers)
- Implement capabilities (uses ConnectHub)
- Handle authentication (uses Auth0)

### 2. ConnectHub (Integration Layer)
**Tech Stack**: Python + FastAPI + PostgreSQL

**Primary Responsibilities**:
- 🔌 **Integration Catalog**: Maintain catalog of available integrations and actions
- 🌐 **OAuth Management**: Handle OAuth flows and credential storage
- 🔑 **Token Management**: Store and refresh third-party tokens (leverages Auth0 Token Vault where available)
- 🔄 **API Proxy**: Execute capability requests on behalf of agents
- 🛡️ **Rate Limiting**: Manage API quotas and request throttling
- 🔐 **Secure Proxy**: Zero raw tokens exposed to workers

**API Surface**:
- `POST /oauth/complete` - Complete OAuth flow for a connection
- `POST /proxy/{internal_action}` - Execute capability via proxy
- `GET /catalog` - List available integrations and actions

### 3. Agent Workers (Graph Execution)
**Tech Stack**: Python + LangGraph + FastAPI

**Primary Responsibilities**:
- 🚀 **Hierarchical Graph Execution**: Run employee supervisor graphs with nested skill graphs
- 💾 **State Management**: Handle LangGraph checkpointing across skill and micro-agent layers
- 🔗 **Capability Integration**: Call ConnectHub for capability execution with hierarchical context
- 📡 **Event Emission**: Publish execution events with hierarchical run_id correlation
- 🔐 **Secure Execution**: Authenticate with Auth0 M2M tokens

**Event Consumption**:
- Subscribes to `runIntent` events from Agent-Core
- Publishes `executionResult` and `agentEvent` events

### 4. Auth0 (External Authentication Service)

**Responsibilities**:
- 👤 **User Authentication**: Manage user (manager) authentication via Universal Login
- 🤖 **Agent Authentication**: M2M authentication for agents and services
- 🔐 **Token Management**: Issue and validate JWTs for all services
- 🏢 **Organization Management**: Multi-tenant isolation via Auth0 Organizations
- 📊 **Audit Logging**: Centralized authentication and authorization logs
- 🔑 **Token Vault**: Secure storage for select third-party OAuth tokens

## Data Flow

### 1. Hierarchical Graph Creation Flow
```
User Request (with Auth0 JWT)
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
Agent-Core (supervisor routes to digital employees)
    ↓
Event Bus (runIntent event with hierarchical context)
    ↓
Agent Worker (compile supervisor graph, execute skill nodes)
    ↓
  ├─ Skill Graph A (micro-agents in-process)
  ├─ Skill Graph B (micro-agents in-process)  
  └─ Each skill calls ConnectHub (proxy capability with Auth0 token)
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
        "auth0_org_id": "org_xxx",
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

### User Authentication
- Managers authenticate via Auth0 Universal Login
- Receive short-lived access tokens (15 minutes)
- Refresh tokens for session management

### Employee Authentication
- Each digital employee has a dedicated M2M application in Auth0
- Longer-lived tokens (1 hour) with automatic refresh
- Scoped to specific skill capabilities and organizations

### Service-to-Service
- ConnectHub and Agent-Core have their own M2M apps
- Internal API calls include Auth0 bearer tokens
- Token validation on every request

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

### Auth0
- **Scaling**: Managed by Auth0
- **Considerations**: M2M token quotas per employee, API rate limits
- **Optimization**: Token caching, efficient skill-based scope design

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
- All services → Auth0 (token validation)

### Asynchronous (Event Bus)
- Agent-Core → Agent Workers (runIntent events)
- Agent Workers → Agent-Core (execution results)
- All services → Event Bus (audit events)

This architecture provides clean separation of concerns while leveraging Auth0's proven authentication infrastructure and maintaining the flexibility to scale each component independently based on load patterns. 