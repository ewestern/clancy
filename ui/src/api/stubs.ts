/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  KPIData,
  ApprovalRequest,
  WorkflowTask,
  Integration,
} from "../types";



const mockKPIData: KPIData = {
  aiEmployees: 7,
  aiEmployeesChange: 1,
  pendingApprovals: 0,
  knowledgeItems: 1,
};

const mockApprovalRequests: ApprovalRequest[] = [
  {
    id: "1",
    employeeId: "1",
    employeeName: "Invoice Assistant",
    summary: "Send $14k invoice to Acme Corp",
    slaHours: 4,
    timestamp: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    employeeId: "2",
    employeeName: "Social Media Manager",
    summary: "Post quarterly results announcement",
    slaHours: 2,
    timestamp: "2024-01-15T11:45:00Z",
  },
  {
    id: "3",
    employeeId: "4",
    employeeName: "Report Generator",
    summary: "Email monthly revenue report to board",
    slaHours: 6,
    timestamp: "2024-01-15T09:15:00Z",
  },
];


const mockIntegrations: Integration[] = [
  {
    id: "1",
    provider: "QuickBooks",
    logo: "https://via.placeholder.com/32x32?text=QB",
    connected: false,
    scopes: [
      {
        id: "invoice_read",
        name: "Invoice.read",
        description: "to read existing invoices",
        level: "read",
        required: true,
      },
      {
        id: "invoice_write",
        name: "Invoice.write",
        description: "to create draft invoices",
        level: "write",
        required: true,
      },
    ],
  },
  {
    id: "2",
    provider: "Slack",
    logo: "https://via.placeholder.com/32x32?text=SL",
    connected: true,
    scopes: [
      {
        id: "chat_write",
        name: "Chat.write",
        description: "to send notifications and summaries",
        level: "write",
        required: true,
      },
    ],
  },
  {
    id: "3",
    provider: "Gmail",
    logo: "https://via.placeholder.com/32x32?text=GM",
    connected: false,
    scopes: [
      {
        id: "email_send",
        name: "Email.send",
        description: "to send automated emails",
        level: "write",
        required: false,
      },
    ],
  },
];

// Mutable mock data store for demo purposes
const currentMockKPIData = { ...mockKPIData };

// API functions
export const fetchKPIData = async (): Promise<KPIData> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  return currentMockKPIData;
};


export const fetchApprovalRequests = async (): Promise<ApprovalRequest[]> => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return mockApprovalRequests;
};



export const approveRequest = async (requestId: string): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  console.log(`Approved request ${requestId}`);
};

export const rejectRequest = async (
  requestId: string,
  reason?: string,
): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  console.log(`Rejected request ${requestId}:`, reason);
};

// Hiring Wizard API functions
//export const analyzeJobDescription = async (
//  jobDescription: string,
//): Promise<string[]> => {
//  await new Promise((resolve) => setTimeout(resolve, 1000));
//
//  // Simulate LLM analysis of job description
//  console.log("Analyzing job description:", jobDescription);
//  const commonVerbs = [
//    "create",
//    "send",
//    "update",
//    "review",
//    "process",
//    "notify",
//    "schedule",
//    "track",
//    "analyze",
//    "generate",
//  ];
//  const detectedVerbs = commonVerbs.filter(() => Math.random() > 0.6);
//  return detectedVerbs.slice(0, 6);
//};

export const generateWorkflow = async (
  jobDescription: string,
): Promise<WorkflowTask[]> => {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // Mock workflow generation
  console.log("Generating workflow for:", jobDescription);
  return [
    {
      id: "1",
      title: "Create monthly invoice",
      frequency: "1× / month",
      runtime: "<2 min",
      subSteps: [
        "Gather billing data from systems",
        "Generate invoice PDF",
        "Send for approval",
        "Email to client",
      ],
    },
    {
      id: "2",
      title: "Post Slack summary",
      frequency: "Daily",
      runtime: "<1 min",
      subSteps: [
        "Compile daily metrics",
        "Format summary message",
        "Post to #general channel",
      ],
    },
    {
      id: "3",
      title: "Update customer records",
      frequency: "As needed",
      runtime: "<30 sec",
      subSteps: [
        "Detect data changes",
        "Validate information",
        "Update CRM records",
      ],
    },
  ];
};

export const fetchIntegrations = async (): Promise<Integration[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockIntegrations;
};


export const getEmployeeActivity = async (id: string, workflowId?: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  const allActivity = [
    {
      id: "1",
      timestamp: "2 min ago",
      type: "success" as const,
      node: "Invoice Generation",
      message: "Successfully created invoice #INV-2024-001 for Acme Corp",
      duration: "1.2s",
      runId: "run-20241215-004",
      workflowId: "wf-1-invoice",
      workflowName: "Invoice Generation",
    },
    {
      id: "2",
      timestamp: "15 min ago",
      type: "info" as const,
      node: "Slack Notification",
      message: "Posted summary to #finance channel",
      duration: "0.8s",
      runId: "run-20241215-003",
      workflowId: "wf-1-invoice",
      workflowName: "Invoice Generation",
    },
    {
      id: "3",
      timestamp: "1 hour ago",
      type: "warning" as const,
      node: "Email Validation",
      message: "Missing customer email, using fallback notification method",
      duration: "2.1s",
      runId: "run-20241215-002",
      workflowId: "wf-1-notifications",
      workflowName: "Payment Notifications",
    },
    {
      id: "4",
      timestamp: "2 hours ago",
      type: "success" as const,
      node: "QuickBooks Sync",
      message: "Updated 12 customer records",
      duration: "3.4s",
      runId: "run-20241215-001",
      workflowId: "wf-1-invoice",
      workflowName: "Invoice Generation",
    },
    {
      id: "5",
      timestamp: "3 hours ago",
      type: "success" as const,
      node: "Payment Reminder",
      message: "Sent payment reminder to 3 overdue customers",
      duration: "1.8s",
      runId: "run-20241214-015",
      workflowId: "wf-1-notifications",
      workflowName: "Payment Notifications",
    },
    {
      id: "6",
      timestamp: "1 day ago",
      type: "error" as const,
      node: "Gmail Connection",
      message: "Failed to authenticate with Gmail API",
      duration: "5.2s",
      runId: "run-20241214-008",
      workflowId: "wf-1-notifications",
      workflowName: "Payment Notifications",
    },
  ];

  // Filter by workflow if specified
  if (workflowId) {
    return allActivity.filter(event => event.workflowId === workflowId);
  }

  return allActivity;
};



export const getEmployeeKnowledge = async (_id: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return [
    {
      id: "1",
      fact: "Acme Corp payment terms are Net 30",
      sourceNode: "Customer Data Processor",
      lastReferenced: "2 min ago",
      visibility: "finance" as const,
    },
    {
      id: "2",
      fact: "Standard invoice template includes company logo",
      sourceNode: "Template Manager",
      lastReferenced: "15 min ago",
      visibility: "public" as const,
    },
    {
      id: "3",
      fact: "Late payment fee is 2% per month",
      sourceNode: "Policy Engine",
      lastReferenced: "1 hour ago",
      visibility: "finance" as const,
    },
    {
      id: "4",
      fact: "Finance team prefers PDF attachments",
      sourceNode: "Preference Tracker",
      lastReferenced: "1 day ago",
      visibility: "sales" as const,
    },
  ];
};

export const getEmployeeHealth = async (_id: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return {
    successRate: 94,
    avgLatency: 1250,
    lastError: "Connection timeout to QuickBooks API",
    sparklineData: [89, 92, 88, 94, 96, 91, 94],
    nextRun: "14:32",
    isPaused: false,
  };
};

export const fetchErrors = async () => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  return [
    {
      id: "error-001",
      employeeId: "sarah-invoice-bot",
      employeeName: "Sarah (Invoice Bot)",
      employeeAvatar: "🤖",
      errorSnippet:
        "Failed to connect to QuickBooks API. Connection timeout after 30 seconds.",
      runId: "run-20241215-001",
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      severity: "high" as const,
    },
    {
      id: "error-002",
      employeeId: "alex-support-bot",
      employeeName: "Alex (Support Bot)",
      employeeAvatar: "🤖",
      errorSnippet:
        "Unable to parse customer email format. Invalid email structure detected.",
      runId: "run-20241215-002",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      severity: "medium" as const,
    },
    {
      id: "error-003",
      employeeId: "maya-hr-bot",
      employeeName: "Maya (HR Bot)",
      employeeAvatar: "🤖",
      errorSnippet:
        "Template file not found: job_offer_template.docx. Please check file path.",
      runId: "run-20241215-003",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      severity: "low" as const,
    },
  ];
};

export const retryRun = async (runId: string): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log(`Retrying run ${runId}`);
  // In real implementation, this would enqueue a RunIntent retry
};
