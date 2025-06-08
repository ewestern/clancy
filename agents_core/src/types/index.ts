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
  estimatedComplexity: 'simple' | 'medium' | 'complex';
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

// Event Models
export interface RunIntentEvent {
  eventId: string;
  type: "runIntent";
  orgId: string;
  agentId: string;
  executionId: string;
  trigger: Trigger;
  context: AgentContext;
  graphSpec: AgentSpec;
  timestamp: string;
}

export interface ExecutionResultEvent {
  eventId: string;
  type: "executionResult";
  orgId: string;
  agentId: string;
  executionId: string;
  status: "completed" | "failed" | "interrupted";
  result?: Record<string, any>;
  error?: string;
  executionTimeMs: number;
  timestamp: string;
}

export type ExecutionStatus = "queued" | "running" | "completed" | "failed";

export interface Event {
  eventId: string;
  type: string;
  orgId: string;
  agentId?: string;
  executionId?: string;
  payload: Record<string, any>;
  timestamp: string;
}

// External Service Interfaces
export interface Capability {
  id: string;
  name: string;
  description: string;
  category: string;
  config: Record<string, any>;
}

export interface ConnectIQClient {
  getCapabilities(orgId: string, category?: string): Promise<Capability[]>;
  findCapabilityOrFallback(taskDescription: string, category?: string): Promise<Capability>;
}

export interface AuthClient {
  getCapabilityToken(agentId: string, capability: string): Promise<string>;
  verifyToken(token: string): Promise<boolean>;
}

export interface EventBusClient {
  emitEvent(event: Event): Promise<void>;
  getEvents(orgId: string, agentId?: string, since?: Date): Promise<Event[]>;
  subscribeToEvents(eventTypes: string[], handler: EventHandler): Promise<void>;
}

export type EventHandler = (event: Event) => Promise<void>;

// Health Check Response
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  dependencies: {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    connectIq: 'healthy' | 'unhealthy';
    authService: 'healthy' | 'unhealthy';
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