import { useState, useEffect, useCallback } from "react";
import { X, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { ChatInterface } from "./wizard/ChatInterface";
import { ProviderCards } from "./wizard/ProviderCards";
import {
  SimpleWorkflowDisplay,
  type SimpleWorkflow,
} from "./wizard/SimpleWorkflowDisplay";
import {
  AgentConnectDisplay,
  type UnsatisfiedWorkflow,
} from "./wizard/AgentConnectDisplay";
import { PhaseProgressIndicator } from "./wizard/PhaseProgressIndicator";
import type {
  CollaborativeWizardData,
  ChatMessage,
  EventMessage,
  ProviderCard,
} from "../types";

import type {
  Event,
  EmployeeStateUpdateEvent,
  RunIntentEvent,
  RequestHumanFeedbackEvent,
  ProviderConnectionCompletedEvent,
  ResumeIntentEvent,
  AgentPrototypeSchema,
} from "@ewestern/events";
import { EventType } from "@ewestern/events";
import {
  Configuration,
  CapabilitiesApi,
  TriggersApi,
  OAuthApi
} from "@ewestern/connect_hub_sdk";
import type {
  Trigger,
  ProviderCapabilities,
  OauthAuditPost200ResponseInner,
} from "@ewestern/connect_hub_sdk";
import { useWebSocketCtx } from "../context/WebSocketContext";
import { useUser, useOrganization, useAuth } from "@clerk/react-router";
import { WebsocketMessage } from "../types";
import {
  EmployeesApi,
  Configuration as AgentsCoreConfiguration,
  EmployeeStatus,
  AgentStatus,
  Employee,
} from "@ewestern/agents_core_sdk";
import { Static } from "@sinclair/typebox";
type AgentPrototype = Static<typeof AgentPrototypeSchema>;

interface HiringWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: Employee) => void;
}

export function HiringWizard({
  isOpen,
  onClose,
  onComplete,
}: HiringWizardProps) {
  //const mockAgents: AgentPrototype[] = [
  //  {
  //    id: "agent-1",
  //    name: "Invoice Processing Agent",
  //    description: "Monthly Invoice Processing",
  //    trigger: {
  //      id: "cron",
  //      providerId: "internal",
  //      triggerParams: {},
  //    },
  //    capabilities: [
  //      { id: "drive.drives.list", providerId: "google" },
  //      { id: "gmail.messages.list", providerId: "google" },
  //    ],
  //    prompt:
  //      "You are an invoice processing assistant that handles monthly billing tasks.",
  //  },
  //  {
  //    id: "agent-2",
  //    name: "Meeting Coordination Agent",
  //    description: "Meeting Coordination Assistant",
  //    trigger: {
  //      id: "message.created",
  //      providerId: "slack",
  //      triggerParams: {},
  //    },
  //    capabilities: [
  //      { id: "chat.post", providerId: "slack" },
  //      { id: "gmail.messages.list", providerId: "google" },
  //    ],
  //    prompt:
  //      "You are a meeting coordination assistant that helps manage calendars and meetings.",
  //  },
  //];

  const [wizardData, setWizardData] = useState<CollaborativeWizardData>({
    jobDescription: "",
    employeeName: "",
    chatHistory: [],
    enhancedWorkflows: [],
    availableProviders: [],
    connectedProviders: [],
    phase: "job_description",
    canComplete: false,
    requireApproval: true,
    slaHours: 24,
    pinToDashboard: true,
  });

  // Store audit results separately to use as single source of truth
  const [auditResults, setAuditResults] = useState<OauthAuditPost200ResponseInner[]>([]);

  // Store simple workflows separately for the workflows phase
  const [simpleWorkflows, setSimpleWorkflows] = useState<SimpleWorkflow[]>([]);

  // Store workflow configurations and unsatisfied workflows for the connect phase
  const [agents, setAgents] = useState<AgentPrototype[]>([]);
  const [unsatisfiedWorkflows, setUnsatisfiedWorkflows] = useState<
    UnsatisfiedWorkflow[]
  >([]);

  // Add state for capability and trigger metadata
  const [providerCapabilities, setProviderCapabilities] = useState<
    Record<string, ProviderCapabilities>
  >({});
  const [triggers, setTriggers] = useState<Record<string, Trigger>>({});

  const { send, subscribe } = useWebSocketCtx();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Track whether the AI assistant has requested feedback from the user
  const [feedbackRequested, setFeedbackRequested] = useState(false);

  const { user } = useUser();
  const { organization } = useOrganization();
  const { getToken } = useAuth();

  const getAuditApi = useCallback(() => {
    return new OAuthApi(
      new Configuration({
        basePath: import.meta.env.VITE_CONNECT_HUB_URL!,
        accessToken: getToken() as Promise<string>,
      }),
    );
  }, [getToken]);

  const getCapabilityApi = useCallback(() => {
    return new CapabilitiesApi(
      new Configuration({
        basePath: import.meta.env.VITE_CONNECT_HUB_URL!,
        accessToken: getToken() as Promise<string>,
      }),
    );
  }, [getToken]);

  const getTriggerApi = useCallback(() => {
    return new TriggersApi(
      new Configuration({
        basePath: import.meta.env.VITE_CONNECT_HUB_URL!,
        accessToken: getToken() as Promise<string>,
      }),
    );
  }, [getToken]);



  const getEmployeeApi = useCallback(() => {
    return new EmployeesApi(
      new AgentsCoreConfiguration({
        basePath: import.meta.env.VITE_AGENTS_CORE_URL!,
        accessToken: getToken() as Promise<string>,
      }),
    );
  }, [getToken]);

  // Fetch capability and trigger metadata when component mounts
  useEffect(() => {
    if (!isOpen) return;

    const fetchMetadata = async () => {
      try {
        const [capabilities, triggersList] = await Promise.all([
          getCapabilityApi().capabilitiesGet(),
          getTriggerApi().triggersGet(),
        ]);

        const providerCapabilityMap = capabilities.reduce(
          (acc, providerCapability) => {
            acc[providerCapability.id] = providerCapability;
            return acc;
          },
          {} as Record<string, ProviderCapabilities>,
        );
        setProviderCapabilities(providerCapabilityMap);

        const triggerMap = triggersList.reduce(
          (acc, trigger) => {
            acc[trigger.id] = trigger;
            return acc;
          },
          {} as Record<string, Trigger>,
        );
        setTriggers(triggerMap);
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
      }
    };

    fetchMetadata();
  }, [isOpen, getCapabilityApi, getTriggerApi]);

  useEffect(() => {
    // Reset wizard when modal opens
    if (isOpen) {
      setWizardData((prev) => ({
        ...prev,
        jobDescription: "",
        employeeName: "",
        chatHistory: [],
        enhancedWorkflows: [],
        availableProviders: [],
        connectedProviders: [],
        phase: "job_description",
        canComplete: false,
        executionId: undefined,
      }));
      //setWizardData((prev) => ({
      //  ...prev,
      //  jobDescription: "",
      //  chatHistory: [],
      //  enhancedWorkflows: [],
      //  availableProviders: [],
      //  connectedProviders: [],
      //  phase: "connect",
      //  canComplete: false,
      //  executionId: undefined,
      //}));
      setSimpleWorkflows([]);
      setAgents([]);
      setUnsatisfiedWorkflows([]);
      setAuditResults([]);
      setFeedbackRequested(false);
    }
  }, [isOpen]);

  const performOAuthAudit = useCallback(
    async (agents: AgentPrototype[]) => {
      if (!organization?.id) {
        console.error("No organization ID available for OAuth audit");
        return;
      }

      try {
        // Prepare the audit request
        const triggers = agents.map((agent) => ({
          providerId: agent.trigger.providerId,
          triggerId: agent.trigger.id,
        }));

        const capabilities = agents.flatMap((agent) => 
          agent.capabilities.map((cap) => ({
            providerId: cap.providerId,
            capabilityId: cap.id,
          }))
        );

        const auditRequest = {
          triggers,
          capabilities,
        };

        const auditApi = getAuditApi();
        const auditResults = await auditApi.oauthAuditPost({
          oauthAuditPostRequest: auditRequest,
        });

        console.log("OAuth audit results:", auditResults);
        setAuditResults(auditResults);

        // Convert audit results to provider cards for UI compatibility
        const providers: ProviderCard[] = auditResults.map((result) => ({
          id: result.providerId,
          name: result.providerDisplayName,
          logo: result.providerIcon,
          connectionStatus: result.status === "connected" ? "connected" : "disconnected",
          requiredScopes: result.missingCapabilities || [], // Use missing capability display names
          oauthUrl: result.oauthUrl,
        }));

        // Check if all providers are connected
        const allConnected = auditResults.length === 0 || auditResults.every(result => result.status === "connected");
        
        setWizardData((prev) => ({
          ...prev,
          availableProviders: providers,
          // Transition to naming phase if no OAuth is needed OR all providers are connected
          phase: auditResults.length === 0 || allConnected ? "naming" : prev.phase,
        }));
      } catch (error) {
        console.error("OAuth audit failed:", error);
        // On audit failure, proceed to naming phase anyway
        setWizardData((prev) => ({
          ...prev,
          phase: "naming",
          availableProviders: [], // No providers available due to audit failure
        }));
        setAuditResults([]);
      }
    },
    [getAuditApi, organization?.id],
  );

  // Handle OAuth audit when agents are set
  useEffect(() => {
    if (agents.length > 0 && wizardData.phase === "connect") {
      performOAuthAudit(agents);
    }
  }, [agents, wizardData.phase, performOAuthAudit]);

  const handleEmployeeStateUpdate = useCallback(async (event: EmployeeStateUpdateEvent) => {
    console.log("Received ai employee update:", event);

    if (event.phase === "workflows") {
      // For workflows phase, store simple workflow data
      const workflows: SimpleWorkflow[] = event.workflows.map(
        (workflow, index) => ({
          id: `workflow-${index}`,
          description: workflow.description,
          steps: workflow.steps.map((step) => step.description),
          activation: workflow.activation,
        }),
      );

      setSimpleWorkflows(workflows);
      setWizardData((prev) => ({
        ...prev,
        phase: "workflows",
      }));
    } else if (event.phase === "connect") {
              // For connect phase (backend may still send "mapping"), handle workflow configs and unsatisfied workflows
      setAgents(event.agents);
      setUnsatisfiedWorkflows(event.unsatisfiedWorkflows);
      setWizardData((prev) => ({
        ...prev,
        phase: "connect",
      }));
    } else {
      console.error("Event should never be in phase:", event.phase);
    }

    setIsAnalyzing(false);
    setIsProcessing(false);
  }, []);

  const handleProviderConnectionCompleted = useCallback(async (
    event: ProviderConnectionCompletedEvent,
  ) => {
    console.log("Received provider connection completed:", event);
    setIsProcessing(false);

    if (event.connectionStatus === "connected") {
      // Update provider status optimistically
      setWizardData((prev) => ({
        ...prev,
        availableProviders: prev.availableProviders.map((p) =>
          p.id === event.providerId
            ? { ...p, connectionStatus: "connected" as const, connectionId: event.connectionId }
            : p,
        ),
      }));

      // Re-run OAuth audit to get the latest status
      // This will update all provider statuses and potentially advance to naming phase
      await performOAuthAudit(agents);
    } else {
      // Connection failed - reset provider status
      setWizardData((prev) => ({
        ...prev,
        availableProviders: prev.availableProviders.map((p) =>
          p.id === event.providerId
            ? { ...p, connectionStatus: "disconnected" as const }
            : p,
        ),
      }));
    }
  }, [agents, performOAuthAudit]);

  const handleRequestHumanFeedback = useCallback((event: RequestHumanFeedbackEvent) => {
    console.log("Received request human feedback:", event);

    const messageContent =
      event.request.type === "text"
        ? event.request.text
        : `Please choose from: ${event.request.options.join(", ")}`;

    setWizardData((prev) => ({
      ...prev,
      chatHistory: [
        ...prev.chatHistory,
        {
          id: Date.now().toString(),
          sender: "agent",
          content: messageContent,
          timestamp: new Date(),
        },
      ],
    }));

    setFeedbackRequested(true);
    setIsProcessing(false);
  }, []);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribeEvent = subscribe("event", (payload: WebsocketMessage) => {
      const eventMessage = payload as EventMessage;
      const event = eventMessage.event as Event;

      switch (event.type) {
        case EventType.EmployeeStateUpdate:
          handleEmployeeStateUpdate(event as EmployeeStateUpdateEvent);
          break;
        case EventType.ProviderConnectionCompleted:
          handleProviderConnectionCompleted(
            event as ProviderConnectionCompletedEvent,
          );
          break;
        case EventType.RequestHumanFeedback:
          handleRequestHumanFeedback(event as RequestHumanFeedbackEvent);
          break;
        default:
          console.log("Unhandled event type:", event.type);
          break;
      }
    });

    return () => {
      unsubscribeEvent();
    };
  }, [isOpen, subscribe, handleEmployeeStateUpdate, handleProviderConnectionCompleted, handleRequestHumanFeedback]);

  if (!isOpen) return null;

  const handleJobDescriptionSubmit = async () => {
    if (!wizardData.jobDescription.trim()) return;

    setIsAnalyzing(true);
    setIsProcessing(true);
    const executionId = "exec-" + crypto.randomUUID();

    // Immediately transition to workflows phase
    setWizardData((prev) => ({
      ...prev,
      phase: "workflows",
      executionId,
    }));

    console.log(
      "Sending job description to backend:",
      wizardData.jobDescription,
    );
    send({
      type: "event",
      timestamp: new Date().toISOString(),
      event: {
        type: EventType.RunIntent,
        orgId: organization?.id,
        timestamp: new Date().toISOString(),
        agentId: "graph-creator",
        details: wizardData.jobDescription,
        executionId: executionId,
        userId: user?.id,
      } as RunIntentEvent,
    });
    console.log("Job description sent to backend");
  };

  const handleSendMessage = (messageContent: string) => {
            // Only add user message to chat history - assistant response will come via WebSocket
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      content: messageContent,
      timestamp: new Date(),
    };

    setWizardData((prev) => ({
      ...prev,
      chatHistory: [...prev.chatHistory, userMessage],
    }));

    setFeedbackRequested(false);
    setIsProcessing(true);
    send({
      type: "event",
      timestamp: new Date().toISOString(),
      event: {
        userId: user?.id,
        type: EventType.ResumeIntent,
        orgId: organization?.id,
        timestamp: new Date().toISOString(),
        agentId: "graph-creator",
        executionId: wizardData.executionId,
        resume: {
          type: "text",
          text: messageContent,
        },
      } as ResumeIntentEvent,
    });
  };

  const handleConnectProvider = async (providerId: string) => {
    // Find the provider from our audit results
    const auditResult = auditResults.find(
      (result) => result.providerId === providerId,
    );
    if (!auditResult?.oauthUrl) {
      console.error("No OAuth URL found for provider:", providerId);
      return;
    }

    // Update provider status to connecting (optimistic update)
    setWizardData((prev) => ({
      ...prev,
      availableProviders: prev.availableProviders.map((p) =>
        p.id === providerId
          ? { ...p, connectionStatus: "connecting" as const }
          : p,
      ),
    }));

    try {
      // Get the Clerk token and append it to the OAuth URL
      const token = await getToken();
      if (!token) {
        console.error("No authentication token available");
        return;
      }

      const url = new URL(auditResult.oauthUrl);
      url.searchParams.set("token", token);

      // Open the authenticated OAuth URL
      window.open(
        url.toString(),
        "_blank",
        "width=600,height=700,scrollbars=yes,resizable=yes",
      );

      console.log(
        "Opening OAuth flow for provider:",
        providerId,
        "with authenticated URL"
      );
    } catch (error) {
      console.error("Failed to launch OAuth flow:", error);
    }
  };

  const handleDisconnectProvider = (providerId: string) => {
    setWizardData((prev) => {
      const newConnectedProviders = prev.connectedProviders.filter(
        (p) => p.id !== providerId,
      );

      return {
        ...prev,
        connectedProviders: newConnectedProviders,
        availableProviders: prev.availableProviders.map((p) =>
          p.id === providerId
            ? {
                ...p,
                connectionStatus: "disconnected" as const,
                accountInfo: undefined,
              }
            : p,
        ),
        canComplete: false, // Don't allow completion until naming is done
      };
    });
  };

  const createEmployee = async (): Promise<Employee> => {
    const employeeApi = getEmployeeApi();
    console.log("agents", JSON.stringify(agents, null, 2));
    return employeeApi.v1EmployeesPost({
      employee: {
        name: wizardData.employeeName || "",
        orgId: organization?.id as string,
        userId: user?.id as string,
        status: EmployeeStatus.Active,
        agents: agents.map((agent) => ({
          name: agent.name,
          description: agent.description,
          capabilities: agent.capabilities.map((capability) => ({
            providerId: capability.providerId,
            id: capability.id,
          })),
          trigger: {
            providerId: agent.trigger.providerId,
            id: agent.trigger.id,
            triggerParams: agent.trigger.triggerParams || {},
          },
          prompt: agent.prompt,
          orgId: organization?.id as string,
          userId: user?.id as string,
          status: AgentStatus.Active,
        })),
      },
    });
  };

  const handleComplete = () => {
    createEmployee().then((employee) => {
      onComplete(employee);
      onClose();
    });
  };

  if (!user) {
    return <div>Please sign in to continue</div>;
  }
  // Job Description Phase
  if (wizardData.phase === "job_description") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-card w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Hire an AI Employee
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-button transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Job Description Input */}
          <div className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                What should your AI employee do?
              </h3>
              <p className="text-gray-600">
                Describe the role and responsibilities. The more detailed, the
                better we can automate it.
              </p>
            </div>

            <div className="space-y-4">
              <textarea
                value={wizardData.jobDescription}
                onChange={(e) =>
                  setWizardData((prev) => ({
                    ...prev,
                    jobDescription: e.target.value,
                  }))
                }
                placeholder="Describe the job and responsibilities...

For example:
We need an AI assistant to handle our monthly invoicing process. This includes gathering billing data from our project management system, creating professional invoices, and sending them to clients for payment. The assistant should also track payment status and send follow-up reminders when necessary."
                className="w-full h-64 p-4 border border-gray-300 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent resize-none"
              />

              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  Minimum 20 characters required. Current:{" "}
                  {wizardData.jobDescription.length}
                </p>

                <button
                  onClick={handleJobDescriptionSubmit}
                  disabled={
                    wizardData.jobDescription.trim().length < 20 || isAnalyzing
                  }
                  className={clsx(
                    "inline-flex items-center px-6 py-3 rounded-button font-medium transition-colors",
                    wizardData.jobDescription.trim().length >= 20 &&
                      !isAnalyzing
                      ? "bg-primary-600 text-white hover:bg-primary-700"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed",
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="mr-2" />
                      Generate Workflows
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // Post Job Description Phases
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-card w-full max-w-7xl max-h-[95vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Configure Your AI Employee
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Review workflows, connect providers, and provide feedback
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-button transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Main Content - Two Pane Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Pane – Chat */}
          <div className="w-1/3 min-w-[280px] border-r border-gray-200 flex flex-col">
            <div className="flex-1 min-h-0">
              <ChatInterface
                messages={wizardData.chatHistory}
                onSendMessage={handleSendMessage}
                isProcessing={isProcessing}
                inputEnabled={feedbackRequested}
              />
            </div>
          </div>

          {/* Right Pane – Dynamic Content */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {wizardData.phase === "workflows" && (
              <>
                {simpleWorkflows.length > 0 ? (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Proposed Workflows
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      These are the automated processes identified from your job
                      description. The system is now analyzing tasks and
                      requirements.
                    </p>
                    <SimpleWorkflowDisplay workflows={simpleWorkflows} />

                    {/* Loading indicator for next phase */}
                    <div className="mt-8 border-t border-gray-200 pt-6">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-3"></div>
                        <span className="text-gray-600">
                          Analyzing integrations and creating AI employees...
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <PhaseProgressIndicator phase="workflows" />
                )}
              </>
            )}

            {wizardData.phase === "connect" && (
              <>
                {/* Empty state when no OAuth is needed */}
                {auditResults.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                      <div className="flex items-center justify-center mb-4">
                        <svg
                          className="h-8 w-8 text-green-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-green-800 mb-2">
                        All Integrations Ready!
                      </h3>
                      <p className="text-green-700">
                        No additional OAuth connections are required for your AI employee. 
                        All necessary integrations are already in place.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Provider Cards Section - First */}
                    {wizardData.availableProviders.length > 0 && (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Required Integrations
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Connect the services your AI Employees need to access.
                        </p>
                        <ProviderCards
                          availableProviders={wizardData.availableProviders}
                          connectedProviders={wizardData.connectedProviders}
                          onConnectProvider={handleConnectProvider}
                          onDisconnectProvider={handleDisconnectProvider}
                        />
                        <div className="mb-8"></div>
                      </>
                    )}
                  </>
                )}

                {/* Workflows Section - Always shown */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Workflows
                </h3>
                <AgentConnectDisplay
                  agents={agents}
                  unsatisfiedWorkflows={unsatisfiedWorkflows}
                  providerCapabilities={providerCapabilities}
                  triggers={triggers}
                />
              </>
            )}

            {wizardData.phase === "naming" && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Name Your AI Employee
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Give your AI employee a name to identify it.
                </p>
                {/* Show subtle notice if no OAuth was needed */}
                {auditResults.length === 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                    <p className="text-sm text-blue-700">
                      ✓ All required integrations are already connected. Your AI employee is ready to use existing connections.
                    </p>
                  </div>
                )}
                <div className="space-y-4">
                  <input
                    type="text"
                    value={wizardData.employeeName}
                    onChange={(e) =>
                      setWizardData((prev) => ({
                        ...prev,
                        employeeName: e.target.value,
                      }))
                    }
                    placeholder="e.g., Invoice Assistant, Meeting Planner"
                    className="w-full h-12 p-3 border border-gray-300 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500">
                    Minimum 3 characters required. Current:{" "}
                    {wizardData.employeeName.length}
                  </p>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() =>
                      setWizardData((prev) => ({
                        ...prev,
                        phase: "ready",
                        canComplete: true,
                      }))
                    }
                    disabled={wizardData.employeeName.length < 3}
                    className={clsx(
                      "inline-flex items-center px-6 py-2 text-sm font-medium rounded-button transition-colors",
                      wizardData.employeeName.length >= 3
                        ? "bg-primary-600 text-white hover:bg-primary-700"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed",
                    )}
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {wizardData.phase === "ready" && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ready to Hire: {wizardData.employeeName}
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Your AI employee is configured and ready to start working.
                  Click "Hire AI Employee" to complete the setup.
                </p>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-green-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        All Set!
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Employee name: {wizardData.employeeName}</li>
                          <li>Workflows configured: {agents.length}</li>
                          <li>
                            Integrations connected:{" "}
                            {wizardData.connectedProviders.length}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-600"></div>

          <button
            onClick={handleComplete}
            disabled={!wizardData.canComplete}
            className={clsx(
              "inline-flex items-center px-6 py-2 text-sm font-medium rounded-button transition-colors",
              wizardData.canComplete
                ? "bg-success-500 text-white hover:bg-success-600"
                : "bg-gray-200 text-gray-400 cursor-not-allowed",
            )}
          >
            🎉 Hire AI Employee
          </button>
        </div>
      </div>
    </div>
  );
}
