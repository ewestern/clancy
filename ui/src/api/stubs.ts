import type { AIEmployee, KPIData, ApprovalRequest, KnowledgeItem } from '../types';

// Mock data
const mockAIEmployees: AIEmployee[] = [
  {
    id: '1',
    name: 'Invoice Assistant',
    role: 'AR Clerk',
    lastRun: '2 hours ago',
    status: 'idle'
  },
  {
    id: '2',
    name: 'Social Media Manager',
    role: 'Content Creator',
    lastRun: '15 minutes ago',
    status: 'running'
  },
  {
    id: '3',
    name: 'Customer Support Bot',
    role: 'Support Agent',
    lastRun: '1 day ago',
    status: 'error'
  },
  {
    id: '4',
    name: 'Report Generator',
    role: 'Data Analyst',
    lastRun: '30 minutes ago',
    status: 'idle'
  },
  {
    id: '5',
    name: 'Email Responder',
    role: 'Customer Service',
    lastRun: '5 minutes ago',
    status: 'running'
  },
  {
    id: '6',
    name: 'Expense Tracker',
    role: 'Bookkeeper',
    lastRun: '4 hours ago',
    status: 'idle'
  },
  {
    id: '7',
    name: 'Meeting Scheduler',
    role: 'Executive Assistant',
    lastRun: '1 hour ago',
    status: 'idle'
  }
];

const mockKPIData: KPIData = {
  humans: 36,
  aiEmployees: 7,
  aiEmployeesChange: 1,
  pendingApprovals: 3,
  knowledgeItems: 128
};

const mockApprovalRequests: ApprovalRequest[] = [
  {
    id: '1',
    employeeId: '1',
    employeeName: 'Invoice Assistant',
    summary: 'Send $14k invoice to Acme Corp',
    slaHours: 4,
    timestamp: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    employeeId: '2',
    employeeName: 'Social Media Manager',
    summary: 'Post quarterly results announcement',
    slaHours: 2,
    timestamp: '2024-01-15T11:45:00Z'
  },
  {
    id: '3',
    employeeId: '4',
    employeeName: 'Report Generator',
    summary: 'Email monthly revenue report to board',
    slaHours: 6,
    timestamp: '2024-01-15T09:15:00Z'
  }
];

const mockKnowledgeItems: KnowledgeItem[] = [
  {
    id: '1',
    title: 'Q4 Financial Report',
    type: 'pdf',
    lastModified: '2024-01-15T08:30:00Z',
    scope: 'finance',
    contributingEmployee: 'Report Generator'
  },
  {
    id: '2',
    title: 'Customer Support Guidelines',
    type: 'doc',
    lastModified: '2024-01-14T16:20:00Z',
    scope: 'support',
    contributingEmployee: 'Customer Support Bot'
  },
  {
    id: '3',
    title: 'Invoice Template',
    type: 'txt',
    lastModified: '2024-01-15T10:15:00Z',
    scope: 'finance',
    contributingEmployee: 'Invoice Assistant'
  }
];

// API functions
export const fetchKPIData = async (): Promise<KPIData> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockKPIData;
};

export const fetchAIEmployees = async (): Promise<AIEmployee[]> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return mockAIEmployees;
};

export const fetchApprovalRequests = async (): Promise<ApprovalRequest[]> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  return mockApprovalRequests;
};

export const fetchKnowledgeItems = async (): Promise<KnowledgeItem[]> => {
  await new Promise(resolve => setTimeout(resolve, 700));
  return mockKnowledgeItems;
};

export const approveRequest = async (requestId: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log(`Approved request ${requestId}`);
};

export const rejectRequest = async (requestId: string, reason?: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log(`Rejected request ${requestId}:`, reason);
}; 