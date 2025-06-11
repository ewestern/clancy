# Agent-Core Service Design Document

## 1. Overview & Scope

### What Agent-Core Does
- **Graph Creation**: Generate hierarchical "Digital Employee" graphs from natural language job descriptions
- **Employee Lifecycle Management**: Create, activate, and manage persistent digital employee identities
- **Supervisor Orchestration**: Route triggers to appropriate skill nodes within digital employees  
- **Hierarchical Coordination**: Handle skill-to-skill communication and workflow dependencies
- **Event Projection**: Maintain runtime checkpoint store from global event stream
- **Intent Emission**: Publish `runIntent` events to execution queue for Agent Workers

### What Agent-Core Does NOT Do
- **Graph Execution**: Delegates to Agent Workers via event queue
- **Capability Implementation**: Delegates to Connect-IQ service
- **Authentication**: Uses external Auth service for token management
- **Event Storage**: Reads from and emits to external event bus

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
│  │         (Digital Employee Builder)                     │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Intent Emitter                             │ │
│  │           (Event Publisher)                             │ │
│  └─────────────────────────────────────────────────────────┘ │
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
**Purpose**: Route incoming triggers to appropriate digital employees and skill nodes within an organization

**Responsibilities**:
- Parse and classify incoming triggers (direct, schedule, external, internal)
- Determine which digital employees should handle each trigger
- Emit `runIntent` events to Agent Workers with hierarchical context
- Handle skill-to-skill coordination within employee graphs

**Key Methods**:
```typescript
async processTrigger(trigger: Trigger): Promise<string[]> // Returns execution_ids
async routeToEmployees(trigger: Trigger): Promise<string[]>  // Returns employee_ids
async emitRunIntent(employeeId: string, trigger: Trigger, context: EmployeeContext): Promise<string>
```

### 3.2 Employee Registry
**Purpose**: Maintain persistent digital employee identities and hierarchical graph structures within organizations

**Responsibilities**:
- Store employee metadata (identity, role, organization, skill composition)
- Track employee creation and lifecycle
- Provide employee lookup and filtering
- Manage hierarchical graph relationships and versions

**Key Data**:
```typescript
interface DigitalEmployee {
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
**Purpose**: Generate hierarchical "Digital Employee" graphs from natural language job descriptions

**Responsibilities**:
- Parse job descriptions into discrete skills using LLM + Retrieval
- Stitch skill templates from template library to create skill graphs
- Assemble employee supervisor graphs linking skill nodes
- Persist and version hierarchical graph structures
- Emit GraphDefined events to trigger downstream systems

**Creation Pipeline**:
1. **JD Parsing**: LLM + Retrieval → List of Skills
2. **Skill Template Stitch**: Template library → Individual skill graphs  
3. **Employee Graph Assembly**: GraphBuilder → Employee supervisor graph
4. **Persist & Version**: Graph Registry → Versioned storage
5. **Emit Event**: FactStream → GraphDefined event

**Key Methods**:
```typescript
async createDigitalEmployee(jobDescription: string, orgId: string): Promise<EmployeeGraphSpec>
async parseJobIntoSkills(jobDescription: string): Promise<SkillIdentification[]>
async createSkillGraph(skillName: string, templates: SkillTemplate[]): Promise<SkillGraphSpec>
async assembleEmployeeGraph(skills: SkillGraphSpec[], role: string): Promise<EmployeeGraphSpec>
```

### 3.5 Intent Emitter
**Purpose**: Emit `runIntent` events to the Agent Workers via event bus

**Responsibilities**:
- Format runIntent events with complete context
- Publish events to message queue
- Handle event routing and delivery confirmation
- Track execution requests

**Key Methods**:
```typescript
async emitRunIntent(event: RunIntentEvent): Promise<void>
async trackExecution(executionId: string, status: ExecutionStatus): Promise<void>
```

## 4. API Contracts

### 4.1 REST Endpoints (Fastify)

```typescript
// Trigger Processing
POST /v1/triggers
{
    type: "direct_command" | "schedule" | "external_event" | "internal_event",
    organization_id: string,
    payload: object,
    source: string,
    metadata?: object
}

// Graph Creation
POST /v1/organizations/:orgId/graphs
{
    job_description: string,
    name: string,
    metadata?: object
}

// Agent Management  
GET /v1/organizations/:orgId/agents
POST /v1/organizations/:orgId/agents
GET /v1/agents/:agentId
PUT /v1/agents/:agentId

// Execution Status
GET /v1/executions/:executionId
GET /v1/organizations/:orgId/executions?status=active|completed|failed

// Health & Monitoring
GET /health
GET /metrics
```

### 4.2 External Service Contracts (HTTP Clients)

```typescript
// Connect-IQ Service
interface ConnectIQClient {
    async getCapabilities(orgId: string, category?: string): Promise<Capability[]>
    async findCapabilityOrFallback(taskDescription: string, category?: string): Promise<Capability>
}

// Auth Service  
interface AuthClient {
    async getCapabilityToken(agentId: string, capability: string): Promise<string>
    async verifyToken(token: string): Promise<boolean>
}

// Event Bus
interface EventBusClient {
    async emitEvent(event: Event): Promise<void>
    async getEvents(orgId: string, agentId?: string, since?: Date): Promise<Event[]>
    async subscribeToEvents(eventTypes: string[], handler: EventHandler): Promise<void>
}
```

## 5. Data Models

### 5.1 Core Types

```typescript
// API Models
interface Trigger {
    type: "direct_command" | "schedule" | "external_event" | "internal_event";
    organizationId: string;
    payload: Record<string, any>;
    source: string;
    metadata?: Record<string, any>;
}

interface AgentIdentity {
    agentId: string;
    organizationId: string;
    role: string;
    capabilities: string[];
    createdAt: Date;
    metadata?: Record<string, any>;
}

interface ExecutionResult {
    executionId: string;
    agentId: string;
    status: "queued" | "running" | "completed" | "failed";
    result?: Record<string, any>;
    error?: string;
}

interface EmployeeGraphSpec {
    graphId: string;
    type: "employee";
    version: string;
    jobDescription: string;
    metadata: {
        role: string;
        organizationId: string;
    };
    nodes: SkillNodeSpec[];
    edges: string[][];
}

interface SkillNodeSpec {
    id: string;
    type: "skill";
    skillGraph: string; // FK to child graph
    trigger?: string;
    permissions: string[];
}

interface SkillGraphSpec {
    graphId: string;
    type: "skill";
    version: string;
    nodes: MicroAgentNodeSpec[];
    edges: string[][];
}

interface MicroAgentNodeSpec {
    id: string;
    action: string;
    parameters: Record<string, any>;
    permissions?: string[];
}

// Event Models
interface RunIntentEvent {
    eventId: string;
    type: "runIntent";
    orgId: string;
    employeeId: string;
    executionId: string;
    runId: string; // Hierarchical format: emp:42_v3:2025-06-09T18:00Z
    trigger: Trigger;
    context: EmployeeContext;
    graphSpec: EmployeeGraphSpec;
    timestamp: string;
}

interface ExecutionResultEvent {
    eventId: string;
    type: "executionResult";
    orgId: string;
    employeeId: string;
    executionId: string;
    runId: string; // Hierarchical format with skill/agent depth
    status: "completed" | "failed" | "interrupted";
    result?: Record<string, any>;
    error?: string;
    skillsExecuted: string[];
    executionTimeMs: number;
    timestamp: string;
}
```

### 5.2 Database Schema (Drizzle ORM)

```typescript
// schema.ts
import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const digitalEmployees = pgTable('digital_employees', {
    employeeId: uuid('employee_id').primaryKey(),
    organizationId: varchar('organization_id', { length: 255 }).notNull(),
    role: varchar('role', { length: 255 }).notNull(),
    graphId: varchar('graph_id', { length: 255 }).notNull(),
    version: varchar('version', { length: 50 }).notNull(),
    skillNodes: jsonb('skill_nodes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastActive: timestamp('last_active'),
    metadata: jsonb('metadata'),
}, (table) => ({
    orgIndex: index('employees_org_idx').on(table.organizationId),
    graphIndex: index('employees_graph_idx').on(table.graphId),
}));

export const graphRegistry = pgTable('graph_registry', {
    graphId: varchar('graph_id', { length: 255 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'employee' | 'skill'
    version: varchar('version', { length: 50 }).notNull(),
    specification: jsonb('specification').notNull(),
    parentGraphId: varchar('parent_graph_id', { length: 255 }), // For skill graphs
    createdAt: timestamp('created_at').defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 255 }),
    status: varchar('status', { length: 50 }).notNull(),
}, (table) => ({
    orgIndex: index('graphs_org_idx').on(table.organizationId),
    typeIndex: index('graphs_type_idx').on(table.type),
}));

export const executions = pgTable('executions', {
    executionId: uuid('execution_id').primaryKey(),
    employeeId: uuid('employee_id').notNull(),
    runId: varchar('run_id', { length: 500 }).notNull(), // Hierarchical run_id
    organizationId: varchar('organization_id', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    triggerType: varchar('trigger_type', { length: 50 }).notNull(),
    skillsExecuted: jsonb('skills_executed'),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    result: jsonb('result'),
    errorMessage: varchar('error_message', { length: 1000 }),
}, (table) => ({
    employeeIndex: index('executions_employee_idx').on(table.employeeId),
    orgIndex: index('executions_org_idx').on(table.organizationId),
    runIdIndex: index('executions_runid_idx').on(table.runId),
}));

export const eventProjections = pgTable('event_projections', {
    eventId: uuid('event_id').primaryKey(),
    orgId: varchar('org_id', { length: 255 }).notNull(),
    employeeId: uuid('employee_id'),
    executionId: uuid('execution_id'),
    runId: varchar('run_id', { length: 500 }), // Hierarchical correlation
    eventType: varchar('event_type', { length: 100 }).notNull(),
    payload: jsonb('payload'),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    scopes: jsonb('scopes'),
}, (table) => ({
    orgIndex: index('events_org_idx').on(table.orgId),
    employeeIndex: index('events_employee_idx').on(table.employeeId),
    runIdIndex: index('events_runid_idx').on(table.runId),
}));

// Removed - replaced by graphRegistry table above for hierarchical graph management
```

## 6. Execution Flows

### 6.1 Direct Command Flow
```
1. POST /v1/triggers (type: "direct_command")
2. Supervisor parses command and identifies target digital employees
3. For each employee:
   a. Load employee context from event projections
   b. Generate hierarchical run_id (emp:graphId:timestamp)
   c. Emit runIntent event to Agent Workers with hierarchical context
   d. Return execution_id
4. Return aggregated execution_ids
```

### 6.2 Hierarchical Execution Flow (Async)
```
1. Agent Worker receives runIntent event with employee graph
2. Agent Worker compiles supervisor graph linking skill nodes
3. For each skill node:
   a. Execute nested skill graph (in-process for MVP)
   b. Emit skill-level checkpoints with hierarchical run_id
   c. Emit micro-agent events with full run_id depth
4. Agent Worker publishes executionResult event with skillsExecuted
5. Agent-Core processes result and updates employee memory
```

### 6.3 Hierarchical Graph Creation Flow
```
1. POST /v1/organizations/{org_id}/employees
2. JD Parsing: LLM + Retrieval → List of Skills (invoice_pipeline, status_updates, etc.)
3. Skill Template Stitch: Template library → Individual skill graphs (micro-agent DAGs)
4. Employee Graph Assembly: GraphBuilder → Employee supervisor graph linking skill nodes
5. Persist & Version: Save to graphRegistry with hierarchical relationships
6. Register digital employee in employee registry
7. Emit GraphDefined event to FactStream
8. Return created employee specification
```

## 7. Implementation Details

### 7.1 Fastify Application Structure

```typescript
// app.ts
import Fastify from 'fastify';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const fastify = Fastify({ logger: true });

// Database connection
const queryClient = postgres(process.env.DATABASE_URL!);
const db = drizzle(queryClient);

// Register plugins
await fastify.register(import('./plugins/database'), { db });
await fastify.register(import('./plugins/auth'));
await fastify.register(import('./plugins/eventBus'));

// Register routes
await fastify.register(import('./routes/triggers'));
await fastify.register(import('./routes/agents'));
await fastify.register(import('./routes/graphs'));
await fastify.register(import('./routes/health'));

export default fastify;
```

### 7.2 Supervisor Implementation

```typescript
// supervisor.ts
import { Trigger, AgentContext, RunIntentEvent } from './types';
import { EventBusClient } from './clients/eventBus';
import { MemorySystem } from './memory';
import { AgentRegistry } from './registry';

export class SupervisorAgent {
    constructor(
        private eventBus: EventBusClient,
        private memory: MemorySystem,
        private registry: AgentRegistry
    ) {}

    async processTrigger(trigger: Trigger): Promise<string[]> {
        // 1. Route trigger to determine which agents should handle it
        const targetAgentIds = await this.routeToAgents(trigger);
        
        // 2. For each target agent, emit runIntent event
        const executionIds: string[] = [];
        
        for (const agentId of targetAgentIds) {
            const executionId = await this.emitRunIntent(agentId, trigger);
            executionIds.push(executionId);
        }
        
        return executionIds;
    }

    private async emitRunIntent(agentId: string, trigger: Trigger): Promise<string> {
        const executionId = generateUuid();
        
        // Load agent context
        const context = await this.memory.getAgentContext(agentId);
        
        // Get agent specification
        const agent = await this.registry.getAgent(agentId);
        
        // Create runIntent event
        const runIntentEvent: RunIntentEvent = {
            eventId: generateUuid(),
            type: "runIntent",
            orgId: trigger.organizationId,
            agentId,
            executionId,
            trigger,
            context,
            graphSpec: agent.specification,
            timestamp: new Date().toISOString()
        };
        
        // Emit to event bus
        await this.eventBus.emitEvent(runIntentEvent);
        
        return executionId;
    }
}
```

### 7.3 Graph Creator Implementation

```typescript
// graphCreator.ts
import { ConnectIQClient } from './clients/connectIQ';
import { MultiAgentSpec, TaskDecomposition } from './types';

export class MultiAgentGraphCreator {
    constructor(
        private connectIQ: ConnectIQClient,
        private llmClient: OpenAIClient
    ) {}

    async createMultiAgentSystem(
        jobDescription: string, 
        orgId: string,
        name?: string
    ): Promise<MultiAgentSpec> {
        // Step 1: Decompose job description into tasks
        const tasks = await this.decomposeJobDescription(jobDescription);
        
        // Step 2: Group tasks into logical agents
        const agentGroups = await this.identifyAgentGroups(tasks);
        
        // Step 3: Create agent specifications
        const agents: AgentSpec[] = [];
        for (const [agentName, agentTasks] of Object.entries(agentGroups)) {
            const agentSpec = await this.createAgentFromTasks(agentName, agentTasks, orgId);
            agents.push(agentSpec);
        }
        
        // Step 4: Identify inter-agent communication
        const messages = this.identifyInterAgentCommunication(agents, tasks);
        
        // Step 5: Create complete specification
        const spec: MultiAgentSpec = {
            version: "0.1",
            jobDescription,
            agents,
            interAgentMessages: messages,
            executionMode: "event-driven"
        };
        
        return spec;
    }

    private async decomposeJobDescription(jobDescription: string): Promise<TaskDecomposition[]> {
        // Use LLM to break down job description into tasks
        const prompt = `
        Break down this job description into distinct, manageable tasks:
        ${jobDescription}
        
        Return JSON array of tasks with:
        - task_description: Clear description
        - category: Type of work (calendar, travel, finance, communication, admin)
        - priority: 1-5 priority level
        - dependencies: List of other task descriptions this depends on
        - estimated_complexity: 'simple', 'medium', or 'complex'
        `;
        
        const response = await this.llmClient.complete(prompt);
        return JSON.parse(response);
    }
}
```

### 7.4 Intent Emitter Implementation

```typescript
// intentEmitter.ts
import { EventBusClient } from './clients/eventBus';
import { RunIntentEvent, ExecutionStatus } from './types';

export class IntentEmitter {
    constructor(
        private eventBus: EventBusClient,
        private db: DatabaseClient
    ) {}

    async emitRunIntent(event: RunIntentEvent): Promise<void> {
        // 1. Save execution record to database
        await this.db.executions.insert({
            executionId: event.executionId,
            agentId: event.agentId,
            organizationId: event.orgId,
            status: 'queued',
            triggerType: event.trigger.type,
            startedAt: new Date(),
        });

        // 2. Emit event to message queue
        await this.eventBus.emitEvent(event);
    }

    async trackExecution(executionId: string, status: ExecutionStatus): Promise<void> {
        await this.db.executions.update({
            where: { executionId },
            data: { 
                status,
                completedAt: status === 'completed' || status === 'failed' ? new Date() : null
            }
        });
    }
}
```

## 8. Testing Strategy

### 8.1 Unit Tests
- **Component isolation**: Mock external services (Connect-IQ, Auth, Event Bus)
- **Event projection logic**: Test state reconstruction from events
- **Supervisor routing**: Test trigger classification and agent selection
- **Memory system**: Test context layering and precedence

### 8.2 Integration Tests
- **End-to-end workflows**: Full trigger → runIntent emission → result processing
- **Multi-agent coordination**: Test agent handoffs and communication
- **Database projections**: Test event sourcing and state rebuilding

### 8.3 Test Structure
```
tests/
├── unit/
│   ├── supervisor.test.ts
│   ├── memory.test.ts
│   ├── graphCreator.test.ts
│   ├── registry.test.ts
│   └── intentEmitter.test.ts
├── integration/
│   ├── endToEnd.test.ts
│   ├── multiAgent.test.ts
│   └── eventProjections.test.ts
├── mocks/
│   ├── connectIQ.ts
│   ├── auth.ts
│   └── eventBus.ts
└── fixtures/
    ├── sampleAgents.ts
    ├── sampleEvents.ts
    └── sampleTriggers.ts
```

## 9. Development Setup

### 9.1 Dependencies
```json
{
  "dependencies": {
    "fastify": "^4.24.0",
    "drizzle-orm": "^0.29.0",
    "postgres": "^3.4.0",
    "@fastify/cors": "^8.4.0",
    "@fastify/helmet": "^11.1.0",
    "openai": "^4.20.0",
    "uuid": "^9.0.0",
    "zod": "^3.22.0",
    "ioredis": "^5.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/uuid": "^9.0.0",
    "typescript": "^5.0.0",
    "vitest": "^0.34.0",
    "drizzle-kit": "^0.20.0"
  }
}
```

### 9.2 Project Structure
```
agent-core/
├── src/
│   ├── index.ts                # Application entry point
│   ├── app.ts                  # Fastify app configuration
│   ├── supervisor.ts           # Supervisor agent
│   ├── registry.ts             # Agent registry
│   ├── memory.ts              # Memory system
│   ├── graphCreator.ts        # Multi-agent graph creation
│   ├── intentEmitter.ts       # Event emission
│   ├── types/                 # TypeScript type definitions
│   ├── routes/                # API route handlers
│   ├── clients/               # External service clients
│   ├── database/              # Database schema and migrations
│   └── utils/                 # Utility functions
├── tests/                     # Test suite
├── migrations/                # Database migrations
├── docker/
│   └── Dockerfile
├── package.json
├── tsconfig.json
├── drizzle.config.ts
└── README.md
```

## 10. Deployment & Infrastructure

### 10.1 Docker Configuration
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### 10.2 Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/agent_core

# External Services
CONNECT_IQ_URL=http://connect-iq:3001
AUTH_SERVICE_URL=http://auth:3002

# Event Bus
REDIS_URL=redis://localhost:6379

# LLM
OPENAI_API_KEY=sk-...

# Application
NODE_ENV=production
PORT=3000
```

This design document reflects the updated architecture where Agent-Core serves as a control plane, orchestrating agent workflows by emitting execution intents to separate Agent Worker services. The Node.js + TypeScript + Fastify + Drizzle ORM stack provides excellent developer experience and performance for the coordination and API responsibilities.

**Key Architectural Changes:**
- **Decoupled Execution**: Agent-Core emits `runIntent` events instead of executing graphs directly
- **Node.js Stack**: Replaced Python/FastAPI with Node.js/Fastify/Drizzle for better control plane performance
- **Event-Driven**: Clear separation between control plane (Agent-Core) and execution workers (Agent Workers)
- **Service Boundaries**: External services (Connect-IQ, Auth, Agent Workers) are clearly defined with contracts 