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
  detectedVerbs: string[];
  proposedWorkflow: WorkflowTask[];
  integrations: Integration[];
  notifications: NotificationSettings;
  requireApproval: boolean;
  slaHours: number;
  scheduleCron?: string;
  pinToDashboard: boolean;
}
