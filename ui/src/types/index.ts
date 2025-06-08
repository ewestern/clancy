export interface AIEmployee {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  lastRun: string;
  status: 'idle' | 'running' | 'error';
}

export interface KPIData {
  humans: number;
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
  type: 'pdf' | 'txt' | 'doc';
  lastModified: string;
  scope: string;
  contributingEmployee: string;
} 