# Graph Creator Design Document

## Overview

The Graph Creator is a specialized digital employee that creates other digital employees from job descriptions. It exemplifies the "dogfooding" principle by using the same agent architecture it creates - event-driven execution, hierarchical skills, memory system, and LangGraph-based workflows.

## Core Design Philosophy

### Interactive & Iterative Creation
**Key Insight**: Job descriptions are inherently incomplete. Rather than attempting to generate complete workflows from partial information, the Graph Creator actively identifies gaps and engages humans to fill them through structured conversation.

**Design Pattern**: Gap-driven workflow where each iteration identifies missing information, prompts users for clarification, incorporates feedback, and reassesses completeness until a validated graph emerges.

### Dogfooding Architecture
The Graph Creator uses the same infrastructure it creates:
- **Event-driven execution** with skill-based decomposition
- **LangGraph workflows** for complex, stateful processes
- **Memory system** for context persistence across interactions
- **Human-in-the-loop** patterns with interrupt-resume capabilities

## Architecture Overview

### High-Level Flow
```
Job Description → Gap Analysis → Human Interaction → Refinement → Validation → Deployment
                      ↑                                      ↓
                      ←─── Iterative Loop (until complete) ───←
```

### Graph Creator Employee Structure
The Graph Creator itself is defined as an `EmployeeGraphSpec` with six core skills:

1. **Initial Analysis**: Decompose job description into preliminary task structure
2. **Gap Identification**: Systematically identify missing information and ambiguities  
3. **Human Interaction**: Present gaps and collect user clarifications
4. **Iterative Refinement**: Update understanding based on feedback
5. **Validation**: Present final graph for user approval
6. **Graph Assembly**: Create and register the completed digital employee

### LangGraph Integration Pattern
- Convert the hard-coded `EmployeeGraphSpec` into a LangGraph `StateGraph`
- Use conditional edges to handle workflow loops and decision points
- Leverage `interrupt()` for human-in-the-loop interactions
- Maintain comprehensive state across multiple interaction sessions

## Key Design Patterns

### Gap-Driven Workflow
Instead of guessing at missing information, the system:
- **Systematically analyzes** task feasibility against available capabilities
- **Categorizes gaps** by type (missing integrations, vague requirements, workflow logic, organizational context)
- **Prioritizes questions** by criticality (blocking vs. nice-to-have)
- **Provides intelligent defaults** when users skip non-critical decisions

### Human-in-the-Loop Integration
- **Interrupt-driven execution**: Use LangGraph's built-in interrupt mechanism to pause for human input
- **Progressive disclosure**: Present information in digestible chunks matched to user decision-making needs
- **Contextual prompting**: Tailor questions based on organization, available capabilities, and previous responses
- **Graceful navigation**: Support back/forward/skip actions in the conversation flow

### Iterative Refinement
- **Version tracking**: Maintain history of task decomposition iterations
- **Feedback incorporation**: Systematically update understanding based on user responses
- **Convergence detection**: Recognize when sufficient information has been gathered
- **Quality assessment**: Continuously evaluate completeness and feasibility

## Skill Design Patterns

### Gap Identification Skill
**Core Logic**: 
- Load organization's available capabilities from Connect Hub
- Analyze each proposed task for feasibility and specificity
- Cross-reference with organizational context and constraints
- Generate categorized list of gaps requiring human input

**Gap Categories**:
- **Missing Integrations**: Tasks requiring unavailable capabilities
- **Underspecified Tasks**: Requirements too vague for implementation
- **Organizational Context**: Assumptions about company processes needing verification
- **Workflow Ambiguities**: Unclear dependencies or decision points

### Human Interaction Skill
**Interaction Types**:
- **Gap Presentation**: Show identified issues with clear explanations
- **Contextual Questioning**: Ask targeted questions with helpful background
- **Choice Selection**: Present capability mapping options with trade-offs
- **Graph Validation**: Display final result with revision capabilities

**Prompt Modes**:
The skill supports two distinct prompt/response loops, enabling the UI to render the right widget and the backend to validate responses without guess-work.

| Kind | When to use | Payload shape | Expected response |
|------|-------------|---------------|-------------------|
| `options` | User must choose one-or-many providers / capabilities / boolean flags | `options: [{ id, label, description? }]` + optional `selectionRules` (single-select, multi-select, min/max) | `{ selected: string[] }` – array of chosen `id`s |
| `questions` | User must elaborate in free-form text | `questions: [{ id, text, exampleAnswer? }]` | `{ answers: Record<id, string> }` – keyed by `id` |

```ts
// Discriminated union shipped over the bus
interface HILPrompt {
  id: string;
  executionId: string;
  promptId: string;
  kind: "options" | "questions";
  messages: { role: "assistant" | "system"; content: string }[];
  inputSchema: Record<string, any>;  // JSON Schema for runtime validation
  // ----- kind-specific -----
  options?: { id: string; label: string; description?: string }[];
  questions?: { id: string; text: string; exampleAnswer?: string }[];
}

interface HILResponse {
  id: string;
  executionId: string;
  promptId: string;
  kind: "options" | "questions";
  // payload must satisfy inputSchema
  payload: unknown;
}
```

**State Management**:
- Track conversation history and user preferences
- Support non-linear navigation (back, skip, restart)
- Maintain context across interaction sessions
- Handle various response types (text, choices, approvals)

### Iterative Refinement Skill
**Refinement Process**:
- Parse and validate user responses
- Update task decomposition and capability mappings
- Incorporate organizational constraints and preferences
- Assess improvement in graph quality and completeness
- Determine if additional gaps have emerged from new information

## State Management Design

### Comprehensive Context Tracking
The workflow maintains rich state including:
- **Request Context**: Original job description, organization, user
- **Analysis Results**: Task decomposition iterations, identified gaps
- **Interaction History**: User responses, preferences, constraints
- **Validation Attempts**: Graph proposals, feedback, approvals
- **Quality Metrics**: Confidence scores, completeness assessments

### Resumability Requirements  
- Support for multi-session interactions (users can come back later)
- Persistence of workflow state across system restarts
- Ability to resume from any point in the process
- Audit trail of all decisions and changes

## Success Metrics & Validation

### Completion Metrics
- **Success Rate**: Percentage of initiated creations resulting in deployed employees
- **Iteration Efficiency**: Average human feedback cycles required
- **Time to Value**: Duration from job description to working employee

### Quality Indicators
- **Employee Effectiveness**: Production performance of created employees
- **Gap Detection Accuracy**: How well the system identifies real issues
- **User Experience**: Satisfaction with the creation process

### Process Optimization
- **Question Relevance**: User feedback on question necessity and clarity
- **Default Quality**: Effectiveness of provided fallback options
- **Learning Effectiveness**: Improvement in gap detection over time

## Implementation Guidelines

### LangGraph Workflow Construction
- Define comprehensive `GraphCreationState` interface
- Create node functions for each skill in the employee specification
- Implement conditional edge logic for workflow loops and decision points
- Use interrupt mechanism for human input collection points

### Controller Interface Design
- Manage active workflow instances with thread persistence
- Handle user response processing and workflow resumption  
- Provide progress tracking and status reporting
- Support workflow cancellation and resource cleanup

### Human Interface Requirements
- Conversational UI supporting rich content presentation
- Multiple interaction patterns (questions, choices, approvals, navigation)
- Progress indicators and context awareness
- Mobile-friendly design for accessibility

## Infrastructure Integration: Event-Driven Execution & HIL

The following details translate the high-level design into concrete infrastructure guidelines that any implementation agent (backend or UI) can follow.

### Core Runtime Actors
1. **Chat Gateway** (WebSocket / Slack bot / etc.)
   - Maintains user sessions and converts every inbound message into an immutable `UIMessage` fact.
   - Pushes UI-directed facts (prompts, status) back to the correct socket.
2. **Fact-Stream (Event Bus)**
   - Append-only log (Kafka, Redis Streams, Postgres logical replication all work).
   - Semantic topics: `ui-messages`, `triggers`, `runIntent`, `hil-prompt`, `hil-response`, `execution-result`.
3. **Trigger Router**
   - Subscribes to `ui-messages`.
   - Emits canonical `TriggerCreated` fact for type `create_graph`.
4. **Supervisor / Agent Dispatcher**
   - Subscribes to `TriggerCreated` → emits `RunIntent` for Graph-Creator employee.
   - Owns pool of LangGraph workers and manages life-cycle (start, pause, resume, complete).
5. **Graph-Creator Worker** (LangGraph)
   - Executes until it hits `interrupt()` → emits `HILPrompt` then serialises state (`executionId` key).
   - On `HILResponse`, re-hydrates state and resumes.
6. **Event / Memory Store**
   - Persists all facts for audit + replay.
   - Exposes projections and checkpoint queries for skills.

### Canonical Event Shapes (abridged)
```jsonc
// UI → Gateway → Fact-Stream
type UIMessage = {
  id: string;              // uuid
  conversationId: string;  // chat room / browser tab
  userId: string;
  content: string;         // raw text
  ts: string;              // ISO date
};

type TriggerCreated = {
  id: string;
  triggerId: string;
  type: "create_graph";
  payload: {
    jobDescription: string;
    name?: string;
  };
  orgId: string;
  ts: string;
};

type RunIntent = {
  id: string;
  executionId: string;
  employeeId: string;      // graph-creator employee
  trigger: TriggerCreated;
  ts: string;
};

type HILPrompt = {
  id: string;
  executionId: string;
  promptId: string;
  kind: "options" | "questions";
  messages: { role: "assistant" | "system"; content: string }[];
  inputSchema: Record<string, any>;  // JSON Schema for runtime validation
  // ----- kind-specific -----
  options?: { id: string; label: string; description?: string }[];
  questions?: { id: string; text: string; exampleAnswer?: string }[];
  ts: string;
};

type HILResponse = {
  id: string;
  executionId: string;
  promptId: string;
  kind: "options" | "questions";
  // payload must satisfy inputSchema
  payload: unknown;
  ts: string;
};

type ExecutionResult = {
  id: string;
  executionId: string;
  status: "completed" | "cancelled" | "failed";
  output?: Record<string, any>;
  ts: string;
};
```

### Sequence (Happy-Path)
1. **User** types job description → **Gateway** publishes `UIMessage`.
2. **Trigger Router** detects `create_graph` → publishes `TriggerCreated`.
3. **Supervisor** emits `RunIntent` (Graph-Creator, `executionId` = uuid).
4. **Worker** runs LangGraph until `interrupt()` → emits `HILPrompt`.
5. **Gateway** forwards prompt to same `conversationId` WebSocket.
6. **User** replies → Gateway publishes `HILResponse`.
7. **Worker** resumes, maybe loops, finally emits `ExecutionResult`.
8. **Gateway** pushes completion status + any artefacts (employee spec) to UI.

### WebSocket Envelope Examples
```jsonc
// client → Gateway
{
  "conversationId": "chat-42",
  "token": "jwt…",
  "text": "Create a customer-onboarding specialist"
}
// Gateway → client (prompt)
{
  "type": "hil_prompt",
  "conversationId": "chat-42",
  "executionId": "exec-99",
  "promptId": "α",
  "messages": [
    { "role": "assistant", "content": "I need to know which CRM you use…" }
  ],
  "inputSchema": { "$schema": "http://json-schema.org/draft-07/schema#", … }
}
```

### LangGraph Worker Requirements
- **Persist** `workflow.serialize()` output keyed by `executionId` before every interrupt.
- **Resume** by reading stored state and calling `workflow.deserialize()`.
- **Idempotent**: If the same `HILResponse` is delivered twice, the state transition must be safe.

### Correlation & Security
- `conversationId ↔ executionId` mapping table ensures only authorised users can answer prompts.
- All events include `orgId` for multi-tenant filtering.

### Minimal Endpoints
| Endpoint | Purpose |
|----------|---------|
| `POST /v1/triggers` | Accepts `{ type: "create_graph", orgId, payload }` → publishes `TriggerCreated` |
| `GET  /v1/executions/:id` | Returns latest projection (status, currentPrompt, progress %) |
| `POST /v1/executions/:id/respond` | Proxy for front-ends that can't publish directly to bus. Accepts `HILResponse` |

These details should be sufficient for an implementation agent to wire up: (1) the WebSocket gateway, (2) event bus topics, (3) dispatcher logic, and (4) LangGraph worker with HIL support.

This design transforms graph creation from an automated process into a collaborative workflow that systematically leverages human expertise to create effective, organization-specific digital employees. 

## Current Implementation Status (2025-08)
The **first functional implementation** of the Graph Creator now lives in `lambdas/src/shared/graphCreator.ts`.  While it follows the principles laid out above, several design choices have been streamlined to ship an MVP quickly.  The key points are:

1.  LangGraph structure
    * **Root graph** (`GraphState`) with three data buckets: `workflows`, `agents`, and `unsatisfiedWorkflows`.
    * Execution starts with **`workflow_breakdown_agent`** which converts the raw job-description into a list of `Workflow` objects using the *WORKFLOW_BREAKDOWN_PROMPT*.
    * For **each** workflow a **sub-graph** (`SubgraphState`) is spawned (`workflow_subgraph_agent`).  This sub-graph contains:
      1. **`workflow_matcher_agent`** – calls two tool wrappers to the Connect-Hub SDK: `get_capabilities` and `get_triggers`.  It tries to map the workflow onto concrete provider capability IDs + a trigger.  If a mapping is impossible it emits an `unsatisfiedWorkflow` instead.
      2. **`workflow_agent_creator_agent`** – once a valid mapping exists, this node produces the final `Agent` spec (including a behaviour prompt) via the *AGENT_CREATOR_PROMPT*.
    * A simple **join** node aggregates the outputs of all sub-graphs and the run terminates.

2.  Prompt & tool usage
    * Prompts are plain-text strings co-located in the source file for quick iteration.
    * The only active tools are:
        * `get_capabilities` – GET `/capabilities` from Connect Hub.
        * `get_triggers` – GET `/triggers` from Connect Hub.
    * A `human_input` tool exists but is **commented out**; no interrupt/resume loop is yet wired in.

3.  Checkpointing & streaming
    * A `PostgresSaver` checkpointer is configured at construction time so every state transition is written to Postgres.
    * `start()` and `resume()` are thin wrappers around `graph.stream()` enabling incremental UI updates in *streamMode: "updates"*.

4.  Type safety
    * All structured responses are validated with `@sinclair/typebox` Schema objects (`WorkflowSchema`, `AgentSchema`, etc.).  Invalid LLM output fails fast.

5.  Gaps vs. original design
    * No explicit *Gap-Identification* / *Human-Interaction* loop – this is implicitly handled by returning `unsatisfiedWorkflow` items without pausing for user input.
    * No persisted conversation history; only LangGraph checkpoints are stored.
    * Trigger parameter resolution is **best-effort** and does not yet validate against provider-supplied JSON Schema.

## Future Improvement Opportunities
1. **Human-in-the-Loop Resumption**  
   Re-enable the `human_input` tool and leverage `interrupt()` to ask clarifying questions whenever `workflow_matcher_agent` cannot satisfy a workflow.
2. **Rich Gap Analysis**  
   Replace the binary *satisfied / unsatisfied* outcome with categorised gap reasons (missing integration, ambiguous requirement, etc.) matching the design doc table.
3. **Trigger Parameter Validation**  
   Fetch JSON Schemas from Connect Hub and validate user-supplied parameters before finalising an `Agent` spec.
4. **Sub-Agent Composition**  
   Allow an `Agent` to include nested sub-agents for complex workflows instead of a flat list.
5. **Scalability & Performance**  
   • Cache capability/trigger look-ups per organisation.  
   • Parallelise sub-graph execution more aggressively.
6. **Extended Checkpointing Strategy**  
   Support pluggable stores (e.g., DynamoDB, Redis) and add automatic cleanup of old execution data.
7. **Testing & Evaluation Harness**  
   Create a golden-set of job descriptions with expected outputs to measure recall/precision of workflow extraction and capability matching over time.
8. **UI Enhancements**  
   Surface progress indicators (% complete, current phase) and let users answer clarifying questions directly in the dashboard.
9. **Security & Multi-Tenancy Hardening**  
   Enforce `orgId` scoping on every Connect Hub call and when reading/writing checkpoints.
10. **Advanced Optimisation**  
   Investigate using retrieval-augmented generation or fine-tuned models to improve the quality of workflow breakdown and matching. 