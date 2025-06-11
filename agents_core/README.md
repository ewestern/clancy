# Agent-Core Service

Agent-Core is the control plane for multi-agent workflow orchestration in the Clancy platform. It handles graph creation, agent lifecycle management, supervisor orchestration, and intent emission to Agent Workers.

## Overview

### What Agent-Core Does

- **Graph Creation**: Generate multi-agent workflows from natural language job descriptions
- **Agent Lifecycle Management**: Create, activate, and manage persistent agent identities
- **Supervisor Orchestration**: Route triggers to appropriate agents within organizations
- **Multi-Agent Coordination**: Handle inter-agent communication and workflow dependencies
- **Event Projection**: Maintain runtime checkpoint store from global event stream
- **Intent Emission**: Publish `runIntent` events to execution queue for Agent Workers

### What Agent-Core Does NOT Do

- **Graph Execution**: Delegates to Agent Workers via event queue
- **Capability Implementation**: Delegates to Connect-IQ service
- **Authentication**: Uses external Auth service for token management
- **Event Storage**: Reads from and emits to external event bus

## Technology Stack

- **Web Framework**: Fastify with TypeBox for schema-first API design
- **Runtime**: Node.js 18+
- **Database**: PostgreSQL with Drizzle ORM
- **Message Queue**: Redis/RabbitMQ/PostgreSQL (event bus)
- **Language**: TypeScript with strict type checking

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for event bus)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/agents_core

# External Services
CONNECT_IQ_URL=http://connect-iq:3001
AUTH_SERVICE_URL=http://auth:3002

# Event Bus
REDIS_URL=redis://localhost:6379

# LLM
OPENAI_API_KEY=sk-...

# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
JWT_SECRET=your-secret-key
```

## API Documentation

Once running, the API documentation is available at:

- **Interactive API Reference**: http://localhost:3000/reference
- **OpenAPI JSON**: http://localhost:3000/openapi.json

## Core Endpoints

### Health & Monitoring

- `GET /health` - Comprehensive health check with dependencies
- `GET /ready` - Kubernetes readiness probe
- `GET /live` - Kubernetes liveness probe
- `GET /info` - Service information
- `GET /metrics` - Prometheus metrics

### Trigger Processing

- `POST /v1/triggers` - Process incoming triggers

### Agent Management

- `GET /v1/organizations/:orgId/agents` - List agents
- `POST /v1/organizations/:orgId/agents` - Create agent
- `GET /v1/agents/:agentId` - Get agent details
- `PUT /v1/agents/:agentId` - Update agent

### Graph Creation

- `POST /v1/organizations/:orgId/graphs` - Create multi-agent system

### Execution Tracking

- `GET /v1/executions/:executionId` - Get execution status
- `GET /v1/organizations/:orgId/executions` - List executions

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Agent-Core Service                         │
│                  (Control Plane)                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Supervisor  │  │   Agent     │  │   Memory    │         │
│  │   Agent     │  │  Registry   │  │   System    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Graph Creator                              │ │
│  │      (Multi-Agent Decomposer)                          │ │
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

## Development

### Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:generate  # Generate database migrations
npm run db:migrate   # Apply database migrations
npm run db:studio    # Open Drizzle Studio

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
```

### Project Structure

```
agents_core/
├── src/
│   ├── index.ts                # Application entry point
│   ├── app.ts                  # Fastify app configuration
│   ├── supervisor.ts           # Supervisor agent
│   ├── registry.ts             # Agent registry
│   ├── memory.ts              # Memory system
│   ├── graphCreator.ts        # Multi-agent graph creation
│   ├── intentEmitter.ts       # Event emission
│   ├── types/                 # TypeScript type definitions
│   │   ├── index.ts           # Core types
│   │   └── fastify.d.ts       # Fastify type extensions
│   ├── schemas/               # TypeBox schemas
│   │   └── index.ts           # API schemas
│   ├── routes/                # API route handlers
│   │   ├── health.ts          # Health check routes
│   │   ├── triggers.ts        # Trigger processing
│   │   ├── agents.ts          # Agent management
│   │   ├── graphs.ts          # Graph creation
│   │   └── executions.ts      # Execution tracking
│   ├── plugins/               # Fastify plugins
│   │   ├── database.ts        # Database connection
│   │   ├── services.ts        # Service registration
│   │   ├── auth.ts            # Authentication
│   │   └── eventBus.ts        # Event bus connection
│   ├── services/              # Business logic services
│   │   ├── tokenService.ts    # JWT token management
│   │   └── auditService.ts    # Audit logging
│   └── database/              # Database schema and migrations
│       └── schema.ts          # Drizzle schema definitions
├── tests/                     # Test suite
├── migrations/                # Database migrations
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── vitest.config.ts
└── README.md
```

## Database Schema

The service uses PostgreSQL with Drizzle ORM. Key tables:

- **agents**: Agent identities and metadata
- **executions**: Execution tracking and results
- **event_projections**: Event sourcing projections
- **multi_agent_systems**: Multi-agent system specifications

## External Dependencies

### Required Services

- **Connect-IQ**: Capability discovery and management
- **Auth Service**: Authentication and authorization
- **Event Bus**: Message queue for inter-service communication

### Optional Services

- **Redis**: Caching and session storage
- **Prometheus**: Metrics collection

## Deployment

### Docker

```bash
# Build image
docker build -t agents-core .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e CONNECT_IQ_URL=http://... \
  agents-core
```

### Environment-specific Configuration

The service automatically configures itself based on `NODE_ENV`:

- **development**: Pretty logging, relaxed validation
- **production**: Structured logging, strict validation, required secrets

## Contributing

1. Follow the [Clancy Development Patterns](../docs/clancy-patterns.md)
2. All APIs must use schema-first design with TypeBox
3. Implement comprehensive error handling
4. Add tests for all new functionality
5. Update OpenAPI documentation

## License

MIT License - see LICENSE file for details.
