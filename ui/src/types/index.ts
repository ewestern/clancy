import type { Event } from "@ewestern/events";

// KPI data - computed from SDK calls
export interface KPIData {
  aiEmployees: number;
  aiEmployeesChange: number;
  pendingApprovals: number;
  knowledgeItems: number;
}

// Legacy approval request interface - will be replaced by SDK ApprovalRequest
export interface ApprovalRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  summary: string;
  slaHours: number;
  timestamp: string;
}

// Hiring Wizard Types
export interface WorkflowTask {
  id: string;
  title: string;
  frequency: string;
  runtime: string;
  subSteps: string[];
}

// Enhanced types for collaborative wizard
export interface WorkflowUpdate {
  id: string;
  action: "add" | "modify" | "remove";
  description: string;
  affectedSteps: string[];
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  content: string;
  timestamp: Date;
  workflowUpdates?: WorkflowUpdate[];
}

export interface EnhancedWorkflow extends WorkflowTask {
  connectionStatus:
    | "requires_connection"
    | "partially_connected"
    | "fully_connected";
  requiredProviders: string[];
  lastUpdated: Date;
  changeHighlight?: boolean;
}

export interface ProviderCard {
  id: string;
  name: string;
  logo: string;
  oauthUrl: string;
  connectionStatus: "disconnected" | "connecting" | "connected";
  requiredScopes: string[];
}

export interface Integration {
  id: string;
  provider: string;
  logo: string;
  scopes: {
    id: string;
    name: string;
    description: string;
    level: "none" | "read" | "write" | "admin";
    required: boolean;
  }[];
  connected: boolean;
}

export interface HiringWizardData {
  jobDescription: string;
  proposedWorkflow: WorkflowTask[];
  integrations: Integration[];
  requireApproval: boolean;
  slaHours: number;
  scheduleCron?: string;
  pinToDashboard: boolean;
}

// New collaborative wizard data structure
export interface CollaborativeWizardData {
  executionId?: string; // Added to track graph creator execution
  jobDescription: string;
  employeeName: string;
  chatHistory: ChatMessage[];
  enhancedWorkflows: EnhancedWorkflow[];
  availableProviders: ProviderCard[];
  connectedProviders: (ProviderCard & { connectionId: string })[];
  phase:
    | "job_description"
    | "workflows"
    | "connect"
    | "naming"
    | "ready"
    | "completed"; // Updated: changed "mapping" to "connect", added "naming"
  canComplete: boolean;
  requireApproval: boolean;
  slaHours: number;
  pinToDashboard: boolean;
}

export interface EventMessage {
  type: "event";
  timestamp: string;
  event: Event;
}

export interface ErrorMessage {
  type: "error";
  timestamp: string;
  data: {
    message: string;
    code: string;
  };
}

export interface StatusUpdateMessage {
  type: "status_update";
  timestamp: string;
  data: {
    status: string;
    details: Record<string, unknown>;
  };
}

export interface NotificationMessage {
  type: "notification";
  timestamp: string;
  data: {
    title: string;
    message: string;
    priority: "low" | "medium" | "high";
  };
}

export type WebsocketMessage =
  | EventMessage
  | ErrorMessage
  | StatusUpdateMessage
  | NotificationMessage;
