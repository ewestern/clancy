# Agent-Core Service Design Document

## 1. Overview & Scope

### What Agent-Core Does
- **Graph Creation**: Generate hierarchical "AI Employee" graphs from natural language job descriptions
- **Employee Lifecycle Management**: Create, activate, and manage persistent ai employee identities
- **Supervisor Orchestration**: Route triggers to appropriate skill nodes within ai employees  
- **Hierarchical Coordination**: Handle skill-to-skill communication and workflow dependencies
- **Event Projection**: Maintain runtime checkpoint store from global event stream
- **Intent Emission**: Publish `runIntent` events to execution queue for Agent Workers
- **Capabilities Infrastructure**: Provide fundamental access to ConnectHub CapabilitiesApi for all ai employees
- **HIL Coordination**: Manage Human-in-the-Loop workflows through specialized subgraphs

### What Agent-Core Does NOT Do
- **Graph Execution**: Delegates to Agent Workers via event queue
- **Capability Implementation**: Delegates to Connect Hub service (but provides fundamental API access)
- **Authentication**: Uses external Auth service for token management
- **Event Storage**: Reads from and emits to external event bus
- **HIL Delivery**: HIL subgraphs handle actual message delivery via ConnectHub capabilities

### Technology Stack
- **Web Framework**: Fastify
- **Runtime**: Node.js 18+
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Message Queue**: Redis/RabbitMQ/PostgreSQL (event bus)
- **Language**: TypeScript

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Agent-Core Service                         │
│                  (Control Plane)                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Supervisor  │  │  Employee   │  │   Memory    │         │
│  │   Router    │  │  Registry   │  │   System    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │            Hierarchical Graph Creator                   │ │
│  │         (AI Employee Builder)                     │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────┐  ┌─────────────────────────────────────────┐ │
│  │Capabilities │  │              Intent Emitter             │ │
│  │ Foundation  │  │           (Event Publisher)             │ │
│  │(CapApi+HIL) │  └─────────────────────────────────────────┘ │
│  └─────────────┘                      │                    │
├─────────────────────────────────────────────────────────────┤
│              Runtime Checkpoint Store                       │
│                   (PostgreSQL)                             │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Event Bus                                │
│               (Message Queue)                               │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                 Agent Workers                               │
│              (Graph Execution)                              │
│                (Separate Service)                          │
└─────────────────────────────────────────────────────────────┘
```

## 3. Core Components

### 3.1 Supervisor Router
**Purpose**: Route incoming triggers to appropriate ai employees and skill nodes within an organization

**Responsibilities**:
- Parse and classify incoming triggers (direct, schedule, external, internal)
- Determine which ai employees should handle each trigger
- Emit `runIntent` events to Agent Workers with hierarchical context
- Handle skill-to-skill coordination within employee graphs

**Key Methods**:
```typescript
async processTrigger(trigger: Trigger): Promise<string[]> // Returns execution_ids
async routeToEmployees(trigger: Trigger): Promise<string[]>  // Returns employee_ids
async emitRunIntent(employeeId: string, trigger: Trigger, context: EmployeeContext): Promise<string>
```

### 3.2 Employee Registry
**Purpose**: Maintain persistent ai employee identities and hierarchical graph structures within organizations

**Responsibilities**:
- Store employee metadata (identity, role, organization, skill composition)
- Track employee creation and lifecycle
- Provide employee lookup and filtering
- Manage hierarchical graph relationships and versions

**Key Data**:
```typescript
interface AIEmployee {
    employeeId: string;
    organizationId: string;
    role: string;
    graphId: string;
    version: string;
    skillNodes: string[];
    createdAt: Date;
    lastActive: Date;
    metadata: Record<string, any>;
}
```

### 3.3 Memory System
**Purpose**: Provide unified context access across execution, employee, skill, and organizational layers

**Responsibilities**:
- Reconstruct employee state from event projections
- Provide layered memory access (execution → skill → employee → org → external)
- Handle memory queries and updates with hierarchical run_id correlation
- Maintain skill-level and micro-agent checkpoints

**Key Methods**:
```typescript
async getEmployeeContext(employeeId: string, executionId?: string): Promise<EmployeeContext>
async getSkillContext(employeeId: string, skillId: string, runId?: string): Promise<SkillContext>
async updateEmployeeMemory(employeeId: string, updates: Record<string, any>): Promise<void>
async getOrganizationalKnowledge(orgId: string): Promise<Record<string, any>>
```

### 3.4 Hierarchical Graph Creator  
**Purpose**: Generate hierarchical "AI Employee" graphs from job descriptions through an **interactive, gap-driven workflow**. The Graph Creator itself is a ai employee that dog-foods the same architecture it produces.

**High-level loop**
1. Job description received  
2. Gap analysis – identify missing information / ambiguities  
3. Human-in-the-loop prompt (`HILPrompt`) sent to the user  
4. Refinement – incorporate answers & re-analyse  
5. Validation – present final graph for approval  
6. Deployment – register graph and emit `GraphDefined`

The loop repeats until no blocking gaps remain.

**Key capabilities**
- Gap-driven questioning that prioritises critical blockers
- Human-in-the-loop via `HILPrompt` / `HILResponse` events on the bus
- Version tracking of refinement iterations and audit trail of conversations
- LangGraph implementation with `interrupt()` calls for human input
- Persistent state for multi-session, crash-safe progress

For the complete design—including skill breakdown, event shapes, and sequence diagrams—see [`GRAPH_CREATOR_DESIGN.md`](./GRAPH_CREATOR_DESIGN.md).

### 3.5 Capabilities Foundation
**Purpose**: Provide fundamental infrastructure for capability discovery and Human-in-the-Loop workflows

**Responsibilities**:
- Maintain CapabilitiesApi client for all ai employees (fundamental infrastructure, not a capability)
- Coordinate HIL workflows through specialized subgraphs
- Route HIL prompts through ConnectHub capabilities (Slack, email, etc.)
- Manage HIL state and response correlation

**Key Methods**:
```typescript
async getAvailableCapabilities(orgId: string): Promise<Capability[]>
async createHILSubgraph(employeeId: string, hilConfig: HILConfig): Promise<HILSubgraph>
async routeHILPrompt(prompt: HILPrompt, deliveryMethods: string[]): Promise<void>
async correlateHILResponse(response: HILResponse): Promise<void>
```

**HIL Subgraph Pattern**:
Every ai employee automatically receives a specialized HIL subgraph that:
- Listens for HIL events on the event bus
- Routes prompts through appropriate ConnectHub capabilities (Slack, email, SMS)
- Manages response correlation and state transitions
- Provides consistent HIL experience across all employees

### 3.6 Intent Emitter
**Purpose**: Emit `runIntent` events to the Agent Workers via event bus

**Responsibilities**:
- Format runIntent events with complete context (including HIL subgraph specs)
- Publish events to message queue
- Handle event routing and delivery confirmation
- Track execution requests

**Key Methods**:
```typescript
async emitRunIntent(event: RunIntentEvent): Promise<void>
async trackExecution(executionId: string, status: ExecutionStatus): Promise<void>
```

## 4. API Contracts

### 4.1 REST Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | /v1/organizations/graphs | Create a ai-employee graph from a job description |
| GET  | /v1/organizations/agents | List ai employees in an organisation |
| GET  | /v1/agents/{agentId} | Retrieve employee details |
| PUT  | /v1/agents/{agentId} | Update employee metadata |
| POST | /v1/executions | trigger a new execution |
| GET  | /v1/executions/{executionId} | Retrieve execution status |
| GET  | /v1/organizations/{orgId}/executions?status=… | Filter executions by status |
| GET  | /health | Liveness & dependency status |
| GET  | /metrics | Prometheus-formatted metrics |

Example request:
```json
POST /v1/triggers
{
  "type": "direct_command",
  "organization_id": "org_123",
  "payload": { "command": "generate_report" }
}
```

### 4.2 External Service Contracts

| Client | Key Operations |
|--------|----------------|
| ConnectHubClient | getCapabilities(orgId, category?) - **FUNDAMENTAL INFRASTRUCTURE**<br/>findCapabilityOrFallback(taskDescription, category?)<br/>routeHILPrompt(prompt, deliveryMethods) |
| AuthClient | getCapabilityToken(agentId, capability)<br/>verifyToken(token) |
| EventBusClient | emitEvent(event)<br/>getEvents(orgId, agentId?, since?)<br/>subscribeToEvents(eventTypes, handler) |

**Note**: The CapabilitiesApi is fundamental infrastructure, not a capability. Every ai employee has automatic access to capability discovery without needing to declare it as a capability dependency.

## 5. Domain Models

### 5.1 Core Entities

| Entity | Key Attributes | Notes |
|--------|----------------|-------|
| Trigger | type, organizationId, payload, source | Enumerated trigger types: direct, schedule, external, internal |
| AIEmployee | employeeId, orgId, role, graphId, version, skillNodes[] | Persisted in `ai_employees` table |
| RunIntentEvent | eventId, orgId, employeeId, executionId, trigger, context, graphSpec | Published on `run_intent` topic |
| ExecutionResultEvent | eventId, orgId, executionId, status, result/error | Correlates with RunIntentEvent for completion |

### 5.2 Database Tables

| Table | Purpose | Notable Columns |
|-------|---------|-----------------|
| ai_employees | Persist employee identity & graph reference | employee_id (PK), org_id, role, graph_id, version |
| graph_registry | Versioned storage of employee & skill graphs | graph_id (PK), org_id, type, version, spec (JSON) |
| executions | Track lifecycle of each run | execution_id (PK), employee_id, run_id, status, started_at, completed_at |
| event_projections | Event-sourced projection store | event_id (PK), org_id, run_id, event_type, payload |

*Full Drizzle definitions can be found in `/src/database/schema.ts`.*

## 6. Execution Flows

### 6.1 Direct Command Flow
```
1. POST /v1/triggers (type: "direct_command")
2. Supervisor parses command and identifies target ai employees
3. For each employee:
   a. Load employee context from event projections
   b. Generate hierarchical run_id (emp:graphId:timestamp)
   c. Emit runIntent event to Agent Workers with hierarchical context
   d. Return execution_id
4. Return aggregated execution_ids
```

### 6.2 Hierarchical Execution Flow (Async)
```
1. Agent Worker receives runIntent event with employee graph + HIL subgraph
2. Agent Worker compiles supervisor graph linking skill nodes
3. Agent Worker initializes HIL subgraph (always-listening for HIL events)
4. For each skill node:
   a. Execute nested skill graph with fundamental CapabilitiesApi access
   b. HIL subgraph handles any interrupt() calls by routing through ConnectHub
   c. Emit skill-level checkpoints with hierarchical run_id
   d. Emit micro-agent events with full run_id depth
5. Agent Worker publishes executionResult event with skillsExecuted
6. Agent-Core processes result and updates employee memory
```

### 6.3 Hierarchical Graph Creation Flow
```
1. POST /v1/organizations/{org_id}/employees
2. JD Parsing: LLM + Retrieval → List of Skills (invoice_pipeline, status_updates, etc.)
3. Capability Foundation: Automatic CapabilitiesApi access + HIL subgraph generation
4. Skill Template Stitch: Template library → Individual skill graphs (micro-agent DAGs)
5. Employee Graph Assembly: GraphBuilder → Employee supervisor graph linking skill nodes
6. HIL Integration: Attach specialized HIL subgraph for human interaction workflows
7. Persist & Version: Save to graphRegistry with hierarchical relationships + HIL specs
8. Register ai employee in employee registry
9. Emit GraphDefined event to FactStream
10. Return created employee specification with HIL capabilities
```

## 7. Key Architectural Decisions

### 7.1 CapabilitiesApi as Fundamental Infrastructure
**Decision**: The CapabilitiesApi is NOT a capability but fundamental infrastructure available to every ai employee.

**Rationale**: 
- Treating capability discovery as a capability creates a chicken-egg problem
- Every ai employee needs to discover available capabilities
- CapabilitiesApi access should be as fundamental as memory or logging

**Implementation**:
- Agent-Core maintains a CapabilitiesApi client as core infrastructure
- Every `runIntent` event includes capability discovery context
- No need to declare "capabilities.list" as a capability dependency

### 7.2 HIL as Specialized Subgraph
**Decision**: Human-in-the-Loop is implemented as a specialized subgraph that every ai employee receives automatically.

**Rationale**:
- Maintains architectural consistency (everything is a graph)
- HIL prompts need to route through ConnectHub capabilities (Slack, email, etc.)
- Provides consistent HIL experience across all employees
- Avoids special-case infrastructure

**Implementation**:
- Every ai employee gets an auto-generated HIL subgraph
- HIL subgraph listens for HIL events on the event bus
- Uses ConnectHub capabilities for actual message delivery
- Manages response correlation and state transitions

### 7.3 Event-Driven HIL Coordination
**Decision**: HIL workflows are managed through event-driven coordination rather than direct API calls.

**Rationale**:
- Supports multi-session, resumable interactions
- Enables HIL prompts to be delivered through multiple channels
- Provides audit trail of all human interactions
- Supports timeout and retry mechanisms

**Implementation**:
- `HILPrompt` events published when `interrupt()` is called
- `HILResponse` events published when humans respond
- HIL subgraph handles correlation and workflow resumption
- All HIL interactions persisted in event store

## 8. Implementation Details (Condensed)

Agent-Core is built as a modular Fastify application written in TypeScript 5+.  The concrete source lives under `src/` and can be consulted for reference; here we focus on the architectural shape.

- **Application shell** (`app.ts`) bootstraps Fastify, registers the database, auth, and event-bus plugins, and mounts feature routes from `src/routes`.
- **Domain services** are thin, test-friendly classes that depend only on injected interfaces:
  - `SupervisorAgent` decides where triggers go and emits `RunIntent` events.
  - `GraphCreator` (gap-driven, human-in-the-loop) iteratively turns job descriptions into employee graphs.
  - `IntentEmitter` persists execution records and publishes to the bus.
- **Dependency Injection** keeps the codebase agnostic of infrastructure; mocks are swapped in during unit tests.
- **Event-Driven** coordination: internal services publish/consume on a message queue (Redis Streams/NATS) rather than calling each other directly.
- **Drizzle ORM** provides type-safe mappings; schema & migrations live side-by-side for traceability.

> Detailed reference snippets (Fastify boot, Drizzle tables, service implementations) have been moved out of the main design doc to keep the narrative concise.

## 9. Testing Strategy

### 9.1 Unit Tests
- **Component isolation**: Mock external services (Connect Hub, Auth, Event Bus)
- **Event projection logic**: Test state reconstruction from events
- **Supervisor routing**: Test trigger classification and agent selection
- **Memory system**: Test context layering and precedence

### 9.2 Integration Tests
- **End-to-end workflows**: Full trigger → runIntent emission → result processing
- **Multi-agent coordination**: Test agent handoffs and communication
- **Database projections**: Test event sourcing and state rebuilding



This design document reflects the updated architecture where Agent-Core serves as a control plane, orchestrating agent workflows by emitting execution intents to separate Agent Worker services. The Node.js + TypeScript + Fastify + Drizzle ORM stack provides excellent developer experience and performance for the coordination and API responsibilities.

**Key Architectural Changes:**
- **Decoupled Execution**: Agent-Core emits `runIntent` events instead of executing graphs directly
- **Node.js Stack**: Replaced Python/FastAPI with Node.js/Fastify/Drizzle for better control plane performance
- **Event-Driven**: Clear separation between control plane (Agent-Core) and execution workers (Agent Workers)
- **Service Boundaries**: External services (Connect Hub, Auth, Agent Workers) are clearly defined with contracts 