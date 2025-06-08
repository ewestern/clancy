// API Models
export interface Trigger {
  type: "direct_command" | "schedule" | "external_event" | "internal_event";
  organizationId: string;
  payload: Record<string, any>;
  source: string;
  metadata?: Record<string, any>;
}

export interface AgentIdentity {
  agentId: string;
  organizationId: string;
  role: string;
  capabilities: string[];
  createdAt: Date;
  lastActive?: Date;
  metadata?: Record<string, any>;
}

export interface ExecutionResult {
  executionId: string;
  agentId: string;
  status: "queued" | "running" | "completed" | "failed";
  result?: Record<string, any>;
  error?: string;
}

export interface MultiAgentSpec {
  version: string;
  jobDescription: string;
  agents: AgentSpec[];
  interAgentMessages: InterAgentMessage[];
  executionMode: string;
}

export interface AgentSpec {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: NodeSpec[];
  edges: string[][];
  specification?: Record<string, any>;
}

export interface NodeSpec {
  id: string;
  type: string;
  config: Record<string, any>;
}

export interface InterAgentMessage {
  from: string;
  to: string;
  messageType: string;
  schema: Record<string, any>;
}

export interface TaskDecomposition {
  taskDescription: string;
  category: string;
  priority: number;
  dependencies: string[];
  estimatedComplexity: "simple" | "medium" | "complex";
  requiredCapabilities: string[];
}

export interface AgentContext {
  agentId: string;
  organizationId: string;
  executionId?: string;
  memory: Record<string, any>;
  capabilities: string[];
  organizationalKnowledge: Record<string, any>;
  externalContext: Record<string, any>;
}

export interface BaseEvent {
  eventId: string;
  orgId: string;
  timestamp: string;
}

export interface RunIntentEvent extends BaseEvent {
  type: "runIntent";
  agentId: string;
  executionId: string;
  trigger: Trigger;
  context: AgentContext;
  graphSpec: AgentSpec;
}

export interface ExecutionResultEvent extends BaseEvent {
  type: "executionResult";
  agentId: string;
  executionId: string;
  status: "completed" | "failed" | "interrupted";
  result?: Record<string, any>;
  error?: string;
  executionTimeMs: number;
}

//export type ExecutionStatus = "queued" | "running" | "completed" | "failed";

//export type Event = RunIntentEvent | ExecutionResultEvent;

export interface AuthClient {
  getCapabilityToken(agentId: string, capability: string): Promise<string>;
  verifyToken(token: string): Promise<boolean>;
}

export interface HealthResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  version: string;
  dependencies: {
    database: "healthy" | "unhealthy";
    redis: "healthy" | "unhealthy";
    connectHub: "healthy" | "unhealthy";
    authService: "healthy" | "unhealthy";
  };
}

// Standard Error Response
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  details?: unknown;
}
