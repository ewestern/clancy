// EventBridge event types for agent execution
export interface BaseEvent {
  eventType: string;
  timestamp: string;
  source: string;
}

// RunIntent event - triggers agent execution
export interface RunIntentEvent extends BaseEvent {
  eventType: "run_intent";
  runId: string;
  agentId: string;
  orgId: string;
  triggerType: "manual" | "scheduled" | "api";
  payload: Record<string, any>;
}

// ResumeIntent event - resumes agent execution after HIL
export interface ResumeIntentEvent extends BaseEvent {
  eventType: "resume_intent";
  runId: string;
  agentId: string;
  orgId: string;
  hilResponse: {
    promptId: string;
    userResponses: Record<string, any>;
  };
}

// Agent metadata from agents_core
export interface AgentMetadata {
  agentId: string;
  name: string;
  description: string;
  type: "digital_employee" | "workflow";
  capabilities: string[];
  config: Record<string, any>;
}

// Enriched event with agent metadata
export interface EnrichedRunIntentEvent extends RunIntentEvent {
  agentMetadata: AgentMetadata;
}

export interface EnrichedResumeIntentEvent extends ResumeIntentEvent {
  agentMetadata: AgentMetadata;
}

// Kinesis event structure for publishing
//export interface KinesisEventPayload {
//  eventType: string;
//  runId: string;
//  agentId: string;
//  orgId: string;
//  timestamp: string;
//  status: 'started' | 'completed' | 'failed' | 'hil_requested';
//  data?: Record<string, any>;
//  error?: string;
//}

// EventBridge event wrapper
export interface EventBridgeEvent<T = any> {
  version: string;
  id: string;
  "detail-type": string;
  source: string;
  account: string;
  time: string;
  region: string;
  detail: T;
}

// Lambda context types
export type LambdaEvent = EventBridgeEvent<RunIntentEvent | ResumeIntentEvent>;
export type EnrichedLambdaEvent = EventBridgeEvent<
  EnrichedRunIntentEvent | EnrichedResumeIntentEvent
>;
