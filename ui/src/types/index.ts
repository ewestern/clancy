export interface AIEmployee {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  lastRun: string;
  status: "idle" | "running" | "error";
}

export interface KPIData {
  aiEmployees: number;
  aiEmployeesChange: number;
  pendingApprovals: number;
  knowledgeItems: number;
}

export interface ApprovalRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  summary: string;
  slaHours: number;
  timestamp: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  type: "pdf" | "txt" | "doc" | "xlsx";
  lastModified: string;
  scope: string;
  contributingEmployee: string;
  visibility: "public" | "internal" | "confidential";
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
  action: 'add' | 'modify' | 'remove';
  description: string;
  affectedSteps: string[];
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: Date;
  workflowUpdates?: WorkflowUpdate[];
}

export interface EnhancedWorkflow extends WorkflowTask {
  connectionStatus: 'requires_connection' | 'partially_connected' | 'fully_connected';
  requiredProviders: string[];
  lastUpdated: Date;
  changeHighlight?: boolean;
}

export interface ProviderCard {
  id: string;
  name: string;
  logo: string;
  category: string; // 'email', 'calendar', 'accounting', etc.
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  accountInfo?: {
    email?: string;
    accountName?: string;
  };
  requiredScopes: string[];
  isExplicitlyMentioned: boolean;
  capabilities: string[];
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

export interface NotificationSettings {
  slack: {
    taskComplete: boolean;
    needsReview: boolean;
    error: boolean;
  };
  email: {
    taskComplete: boolean;
    needsReview: boolean;
    error: boolean;
  };
  sms: {
    taskComplete: boolean;
    needsReview: boolean;
    error: boolean;
  };
}

export interface HiringWizardData {
  jobDescription: string;
  proposedWorkflow: WorkflowTask[];
  integrations: Integration[];
  notifications: NotificationSettings;
  requireApproval: boolean;
  slaHours: number;
  scheduleCron?: string;
  pinToDashboard: boolean;
}

// New collaborative wizard data structure
export interface CollaborativeWizardData {
  jobDescription: string;
  chatHistory: ChatMessage[];
  enhancedWorkflows: EnhancedWorkflow[];
  availableProviders: ProviderCard[];
  connectedProviders: ProviderCard[];
  phase: 'job_description' | 'collaboration' | 'completion';
  canComplete: boolean;
  notifications: NotificationSettings;
  requireApproval: boolean;
  slaHours: number;
  pinToDashboard: boolean;
}

// WebSocket message types for wizard collaboration
export interface WizardWebSocketMessage {
  type: 'workflow_update' | 'provider_connected' | 'chat_message' | 'completion_check' | 'job_analysis';
  payload: {
    workflowUpdates?: WorkflowUpdate[];
    connectedProvider?: ProviderCard;
    chatMessage?: ChatMessage;
    availableProviders?: ProviderCard[];
    enhancedWorkflows?: EnhancedWorkflow[];
    canComplete?: boolean;
  };
}
