/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  AIEmployee,
  KPIData,
  ApprovalRequest,
  KnowledgeItem,
  WorkflowTask,
  Integration,
  CollaborativeWizardData,
} from "../types";

// Mock data
const mockAIEmployees: AIEmployee[] = [
  {
    id: "1",
    name: "Invoice Assistant",
    role: "AR Clerk",
    lastRun: "2 hours ago",
    status: "idle",
  },
  {
    id: "2",
    name: "Social Media Manager",
    role: "Content Creator",
    lastRun: "15 minutes ago",
    status: "running",
  },
  {
    id: "3",
    name: "Customer Support Bot",
    role: "Support AI Employee",
    lastRun: "1 day ago",
    status: "error",
  },
  {
    id: "4",
    name: "Report Generator",
    role: "Data Analyst",
    lastRun: "30 minutes ago",
    status: "idle",
  },
  {
    id: "5",
    name: "Email Responder",
    role: "Customer Service",
    lastRun: "5 minutes ago",
    status: "running",
  },
  {
    id: "6",
    name: "Expense Tracker",
    role: "Bookkeeper",
    lastRun: "4 hours ago",
    status: "idle",
  },
  {
    id: "7",
    name: "Meeting Scheduler",
    role: "Executive Assistant",
    lastRun: "1 hour ago",
    status: "idle",
  },
];

const mockKPIData: KPIData = {
  aiEmployees: 7,
  aiEmployeesChange: 1,
  pendingApprovals: 3,
  knowledgeItems: 128,
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

const mockKnowledgeItems: KnowledgeItem[] = [
  {
    id: "doc-001",
    title: "Q4 2024 Financial Report",
    type: "pdf",
    lastModified: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    scope: "finance",
    contributingEmployee: "Sarah (Invoice Bot)",
    visibility: "internal",
  },
  {
    id: "doc-002",
    title: "Acme Corp Contract Template",
    type: "doc",
    lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    scope: "sales",
    contributingEmployee: "Maya (HR Bot)",
    visibility: "confidential",
  },
  {
    id: "doc-003",
    title: "Customer Support Guidelines v2.1",
    type: "pdf",
    lastModified: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    scope: "support",
    contributingEmployee: "Alex (Support Bot)",
    visibility: "public",
  },
  {
    id: "doc-004",
    title: "Invoice Processing Checklist",
    type: "doc",
    lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    scope: "finance.invoices",
    contributingEmployee: "Sarah (Invoice Bot)",
    visibility: "internal",
  },
  {
    id: "doc-005",
    title: "Sales Presentation Template",
    type: "doc",
    lastModified: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    scope: "sales.presentations",
    contributingEmployee: "Maya (HR Bot)",
    visibility: "internal",
  },
  {
    id: "doc-006",
    title: "Vendor Payment Schedule Q1 2025",
    type: "xlsx",
    lastModified: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    scope: "finance.reports",
    contributingEmployee: "Sarah (Invoice Bot)",
    visibility: "confidential",
  },
  {
    id: "doc-007",
    title: "Product Pricing Strategy",
    type: "pdf",
    lastModified: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    scope: "sales.proposals",
    contributingEmployee: "Maya (HR Bot)",
    visibility: "confidential",
  },
  {
    id: "doc-008",
    title: "Troubleshooting FAQ",
    type: "txt",
    lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    scope: "support.faqs",
    contributingEmployee: "Alex (Support Bot)",
    visibility: "public",
  },
  {
    id: "doc-009",
    title: "Company Privacy Policy",
    type: "pdf",
    lastModified: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    scope: "public",
    contributingEmployee: "Maya (HR Bot)",
    visibility: "public",
  },
  {
    id: "doc-010",
    title: "Internal Expense Guidelines",
    type: "doc",
    lastModified: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    scope: "finance.policies",
    contributingEmployee: "Sarah (Invoice Bot)",
    visibility: "internal",
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

// API functions
export const fetchKPIData = async (): Promise<KPIData> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockKPIData;
};

export const fetchAIEmployees = async (): Promise<AIEmployee[]> => {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return mockAIEmployees;
};

export const fetchApprovalRequests = async (): Promise<ApprovalRequest[]> => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return mockApprovalRequests;
};

export const fetchKnowledgeItems = async (): Promise<KnowledgeItem[]> => {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return mockKnowledgeItems;
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

export const connectIntegration = async (
  integrationId: string,
): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 800));
  console.log(`Connected integration ${integrationId}`);
};

export const createAIEmployee = async (
  wizardData: CollaborativeWizardData,
): Promise<AIEmployee> => {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Simulate AI employee creation
  const newEmployee: AIEmployee = {
    id: String(Date.now()),
    name: "New AI Assistant",
    role: "Assistant",
    lastRun: "Never",
    status: "idle",
  };

  console.log("Created AI Employee:", newEmployee, "with data:", wizardData);
  return newEmployee;
};

// Employee Profile API functions
export const getAIEmployee = async (id: string): Promise<AIEmployee> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const employee = mockAIEmployees.find((emp) => emp.id === id);
  if (!employee) {
    throw new Error("Employee not found");
  }
  return employee;
};

export const getEmployeeActivity = async (_id: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return [
    {
      id: "1",
      timestamp: "2 min ago",
      type: "success" as const,
      node: "Invoice Generation",
      message: "Successfully created invoice #INV-2024-001 for Acme Corp",
      duration: "1.2s",
      runId: "run-20241215-004",
    },
    {
      id: "2",
      timestamp: "15 min ago",
      type: "info" as const,
      node: "Slack Notification",
      message: "Posted summary to #finance channel",
      duration: "0.8s",
      runId: "run-20241215-003",
    },
    {
      id: "3",
      timestamp: "1 hour ago",
      type: "warning" as const,
      node: "Data Validation",
      message: "Missing customer email, using fallback notification method",
      duration: "2.1s",
      runId: "run-20241215-002",
    },
    {
      id: "4",
      timestamp: "2 hours ago",
      type: "success" as const,
      node: "QuickBooks Sync",
      message: "Updated 12 customer records",
      duration: "3.4s",
      runId: "run-20241215-001",
    },
  ];
};

export const getEmployeePermissions = async (_id: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return [
    {
      id: "1",
      provider: "QuickBooks",
      scope: "Invoice.write",
      level: "write" as const,
      reason: "Create and modify invoices",
      connected: true,
    },
    {
      id: "2",
      provider: "Slack",
      scope: "Chat.write",
      level: "write" as const,
      reason: "Post notifications to channels",
      connected: true,
    },
    {
      id: "3",
      provider: "Gmail",
      scope: "Mail.send",
      level: "write" as const,
      reason: "Send invoice notifications",
      connected: false,
    },
  ];
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
