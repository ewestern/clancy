# clancy-lambdas

This project contains source code and supporting files for Clancy's agent execution lambdas. These functions handle asynchronous agent invocations through EventBridge pipes and publish results to Kinesis.

## Lambda Functions

### AgentEnrichment
- **Purpose**: EventBridge pipe enrichment step that adds agent metadata to events
- **Trigger**: EventBridge events with `run_intent` or `resume_intent`
- **Function**: Retrieves agent metadata from agents_core and enriches events
- **Output**: Publishes enriched events to Kinesis for further processing

### GraphCreatorExecutor  
- **Purpose**: Executes graph creator agent workflows
- **Trigger**: EventBridge events for graph creator agents (routed by EventBridge rules)
- **Function**: Handles graph creation workflows using connect_hub capabilities
- **Output**: Publishes execution status and results to Kinesis

### MainAgentExecutor
- **Purpose**: Executes general agent workflows (non-graph-creator)
- **Trigger**: EventBridge events for all other agents (routed by EventBridge rules)
- **Function**: Handles standard agent execution using connect_hub capabilities
- **Output**: Publishes execution status and results to Kinesis

### HelloWorldFunction (Reference)
- **Purpose**: Example function for API Gateway testing
- **Trigger**: API Gateway `/hello` endpoint
- **Function**: Returns a simple "hello world" response

## Project Structure

```
lambdas/
├── src/
│   ├── agent-enrichment/     # AgentEnrichment lambda
│   ├── graph-creator-executor/ # GraphCreatorExecutor lambda  
│   ├── main-agent-executor/   # MainAgentExecutor lambda
│   ├── hello-world/          # HelloWorldFunction (reference)
│   └── shared/              # Shared types and utilities
├── events/                  # Test EventBridge events
├── dist/                   # Built lambda functions
├── package.json           # Dependencies and build scripts
└── template.yaml         # SAM template (for local testing only)

## Architecture

The lambda functions follow an event-driven architecture:

1. **EventBridge** receives `run_intent` and `resume_intent` events
2. **AgentEnrichment** enriches events with agent metadata from agents_core
3. **EventBridge rules** route enriched events to appropriate executors:
   - Graph creator events → **GraphCreatorExecutor**
   - All other events → **MainAgentExecutor**
4. **Executors** process events using connect_hub capabilities
5. **Kinesis** receives status updates and results from all lambdas

## Environment Variables

The lambdas require these environment variables:

- `AGENTS_CORE_API_URL`: URL for the agents_core API (used by AgentEnrichment)
- `CONNECT_HUB_API_URL`: URL for the connect_hub API (used by executors)
- `KINESIS_STREAM_NAME`: Name of the Kinesis stream for event publishing
- `NODE_ENV`: Environment (dev/staging/prod)

## Deployment

**Note**: This project uses SAM for local testing and building only. Deployment is handled by Terraform in the `infra/` directory, which references the built lambda functions.

## Prerequisites

* Node.js 22+
* SAM CLI (for local testing)
* Docker (for local testing)

## Build and Test

### Install Dependencies

```bash
npm install
```

### Build All Functions

```bash
npm run build
```

### Build Individual Functions

```bash
npm run build:agent-enrichment
npm run build:graph-creator-executor  
npm run build:main-agent-executor
npm run build:hello-world
```

### Local Testing with SAM

**Note**: These lambda functions are designed for EventBridge triggers. For local testing, you'll need to provide the appropriate environment variables and use the sample events.

#### Test AgentEnrichment Function

```bash
sam local invoke AgentEnrichmentFunction \
  --event events/run-intent-event.json \
  --env-vars '{
    "AgentEnrichmentFunction": {
      "AGENTS_CORE_API_URL": "http://localhost:3001",
      "KINESIS_STREAM_NAME": "test-stream"
    }
  }'
```

#### Test GraphCreatorExecutor Function

```bash
sam local invoke GraphCreatorExecutorFunction \
  --event events/graph-creator-run-intent-event.json \
  --env-vars '{
    "GraphCreatorExecutorFunction": {
      "CONNECT_HUB_API_URL": "http://localhost:3002",
      "KINESIS_STREAM_NAME": "test-stream"
    }
  }'
```

#### Test MainAgentExecutor Function

```bash
sam local invoke MainAgentExecutorFunction \
  --event events/enriched-run-intent-event.json \
  --env-vars '{
    "MainAgentExecutorFunction": {
      "CONNECT_HUB_API_URL": "http://localhost:3002", 
      "KINESIS_STREAM_NAME": "test-stream"
    }
  }'
```

## Event Types

### Sample Events

The `events/` directory contains sample EventBridge events for testing:

- `run-intent-event.json` - Basic RunIntent event for AgentEnrichment
- `resume-intent-event.json` - ResumeIntent event for AgentEnrichment  
- `enriched-run-intent-event.json` - Enriched event for MainAgentExecutor
- `graph-creator-run-intent-event.json` - Graph creator event for GraphCreatorExecutor

### Event Flow

1. **RunIntent/ResumeIntent** → AgentEnrichment → **Enriched Event** → Executor
2. **Executor** → Agent Processing → **Status Events** → Kinesis
3. If HIL required: **HIL Request** → Kinesis → External System → **ResumeIntent**

## Testing with Hello World

For basic connectivity testing, you can still use the Hello World function:

```bash
sam local start-api
curl http://localhost:3000/hello
```

## Development

### Type Checking

```bash
npm run compile
```

### Linting

```bash
npm run lint
```

### Testing

```bash
npm test
```

## Production Deployment

The lambda functions are deployed via Terraform in the `infra/` directory. The Terraform configuration references the built functions from this project.

1. Build the functions: `npm run build`
2. Navigate to `infra/` directory  
3. Run Terraform deployment

## Monitoring

All lambda functions publish events to Kinesis for monitoring and observability:

- **Run Started**: When agent execution begins
- **Run Completed**: When agent execution finishes successfully  
- **Run Failed**: When agent execution fails
- **HIL Requested**: When human input is required

Monitor these events in your Kinesis stream or downstream consumers.

## Architecture Notes

- **Single NPM Project**: All lambdas share dependencies and build configuration
- **Shared Utilities**: Common types and utilities in `src/shared/`
- **SDK Integration**: Uses autogenerated SDKs for agents_core and connect_hub
- **Event-Driven**: Fully asynchronous communication via EventBridge and Kinesis
- **Terraform Deployment**: SAM used only for local testing, production via Terraform
