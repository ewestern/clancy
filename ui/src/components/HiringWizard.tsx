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
import { Configuration, CapabilitiesApi, TriggersApi } from "@ewestern/connect_hub_sdk";
import type { Trigger, ProviderCapabilities } from "@ewestern/connect_hub_sdk";
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
  const [isFinalizing, setIsFinalizing] = useState(false);
  // Track whether the AI assistant has requested feedback from the user
  const [feedbackRequested, setFeedbackRequested] = useState(false);

  const { user } = useUser();
  const { organization } = useOrganization();
  const { getToken } = useAuth();

  // No audit API needed; we construct provider cards and OAuth URLs client-side

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
      setSimpleWorkflows([]);
      setAgents([]);
      setUnsatisfiedWorkflows([]);
      setFeedbackRequested(false);
      setIsFinalizing(false);
    }
  }, [isOpen]);
  // Build provider cards from agents' requested permissions
  useEffect(() => {
    if (agents.length > 0 && wizardData.phase === "connect") {
      const providerToItems: Record<string, Set<string>> = {};
      for (const agent of agents) {
        for (const cap of agent.capabilities) {
          if (!providerToItems[cap.providerId]) providerToItems[cap.providerId] = new Set();
          providerToItems[cap.providerId]!.add(cap.id);
        }
        if (agent.trigger) {
          const pid = agent.trigger.providerId;
          if (!providerToItems[pid]) providerToItems[pid] = new Set();
          providerToItems[pid]!.add(agent.trigger.id);
        }
      }

      const providers: ProviderCard[] = Object.entries(providerToItems).map(
        ([providerId, itemIds]) => {
          const meta = providerCapabilities[providerId];
          const friendlyNames: string[] = [];
          const caps = meta?.capabilities || [];
          const capNameById = caps.reduce<Record<string, string>>((acc, c) => {
            acc[c.id] = c.displayName;
            return acc;
          }, {});
          for (const itemId of itemIds) {
            const triggerDisplay = triggers[itemId]?.displayName;
            friendlyNames.push(capNameById[itemId] || triggerDisplay || itemId);
          }
          return {
            id: providerId,
            name: meta?.displayName || providerId,
            logo: meta?.icon || "",
            connectionStatus: "disconnected",
            requiredScopes: friendlyNames,
            oauthUrl: "",
          };
        },
      );

      setWizardData((prev) => ({
        ...prev,
        availableProviders: providers,
      }));
    }
  }, [agents, wizardData.phase, providerCapabilities, triggers]);

  const handleEmployeeStateUpdate = useCallback(
    async (event: EmployeeStateUpdateEvent) => {
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
        setAgents(event.agents);
        setUnsatisfiedWorkflows(event.unsatisfiedWorkflows);
        setWizardData((prev) => ({
          ...prev,
          phase: "connect",
        }));
        setIsFinalizing(false);
      } else if (event.phase === "resolved") {
        // All trigger parameters resolved, move to naming
        setWizardData((prev) => ({
          ...prev,
          phase: "naming",
        }));
        setIsFinalizing(false);
      } else {
        console.error("Event should never be in phase:", event.phase);
      }

      setIsAnalyzing(false);
      setIsProcessing(false);
    },
    [],
  );

  const handleProviderConnectionCompleted = useCallback(
    async (event: ProviderConnectionCompletedEvent) => {
      console.log("Received provider connection completed:", event);
      setIsProcessing(false);

      if (event.connectionStatus === "connected") {
        // Update provider status and advance if all connected
        setWizardData((prev) => {
          const updated = prev.availableProviders.map((p) =>
            p.id === event.providerId
              ? { ...p, connectionStatus: "connected" as const, connectionId: event.connectionId }
              : p,
          );
          const allConnected = updated.every((p) => p.connectionStatus === "connected");
          if (allConnected) {
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
                resume: {},
              } as ResumeIntentEvent,
            });
            // Wait for "resolved" event to advance to naming
            setIsFinalizing(true);
          }
          return {
            ...prev,
            availableProviders: updated,
            phase: prev.phase,
          };
        });
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
    },
    [],
  );

  const handleRequestHumanFeedback = useCallback(
    (event: RequestHumanFeedbackEvent) => {
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
    },
    [],
  );

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
  }, [
    isOpen,
    subscribe,
    handleEmployeeStateUpdate,
    handleProviderConnectionCompleted,
    handleRequestHumanFeedback,
  ]);

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
      const token = await getToken();
      if (!token) {
        console.error("No authentication token available");
        return;
      }

      // Build permission list for provider from agents
      const permissionsSet = new Set<string>();
      for (const agent of agents) {
        for (const cap of agent.capabilities) {
          if (cap.providerId === providerId) {
            permissionsSet.add(`${providerId}/${cap.id}`);
          }
        }
        if (agent.trigger && agent.trigger.providerId === providerId) {
          permissionsSet.add(`${providerId}/${agent.trigger.id}`);
        }
      }

      const baseUrl = (import.meta.env.VITE_CONNECT_HUB_URL || "").replace(/\/$/, "");
      const url = new URL(`${baseUrl}/oauth/launch/${providerId}`);
      for (const perm of permissionsSet) {
        url.searchParams.append("permissions", perm);
      }
      url.searchParams.set("token", token);

      window.open(
        url.toString(),
        "_blank",
        "width=600,height=700,scrollbars=yes,resizable=yes",
      );
      console.log("Opening OAuth flow for provider:", providerId);
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

  // Progress tracker component
  const ProgressTracker = () => {
    const phases = [
      { id: "job_description", label: "Job Description", completed: true },
      {
        id: "workflows",
        label: "Workflows",
        completed: wizardData.phase !== "job_description",
      },
      {
        id: "connect",
        label: "Integrations",
        completed: ["naming", "ready"].includes(wizardData.phase),
      },
      {
        id: "naming",
        label: "Naming",
        completed: wizardData.phase === "ready",
      },
      { id: "ready", label: "Ready", completed: false },
    ];

    const currentPhaseIndex = phases.findIndex(
      (phase) => phase.id === wizardData.phase,
    );

    return (
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {phases.map((phase, index) => (
            <div key={phase.id} className="flex items-center">
              <div
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  index < currentPhaseIndex
                    ? "bg-green-500 text-white"
                    : index === currentPhaseIndex
                      ? "bg-primary-600 text-white"
                      : "bg-gray-300 text-gray-600",
                )}
              >
                {index < currentPhaseIndex ? "✓" : index + 1}
              </div>
              <span
                className={clsx(
                  "ml-2 text-sm font-medium",
                  index <= currentPhaseIndex
                    ? "text-gray-900"
                    : "text-gray-500",
                )}
              >
                {phase.label}
              </span>
              {index < phases.length - 1 && (
                <div
                  className={clsx(
                    "w-12 h-px mx-4",
                    index < currentPhaseIndex ? "bg-green-500" : "bg-gray-300",
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
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

          {/* Progress Tracker */}
          <ProgressTracker />

          {/* Job Description Input */}
          <div className="p-6">
            <div className="text-center mb-6">
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
                      Next
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

        {/* Progress Tracker */}
        <ProgressTracker />

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
                    {/* Loading indicator for next phase - moved to top */}
                    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 mr-3"></div>
                        <span className="text-blue-700 font-medium">
                          Analyzing integrations and creating AI employees...
                        </span>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Proposed Workflows
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      These are the automated processes identified from your job
                      description. The system is now analyzing tasks and
                      requirements.
                    </p>
                    <SimpleWorkflowDisplay workflows={simpleWorkflows} />
                  </>
                ) : (
                  <PhaseProgressIndicator phase="workflows" />
                )}
              </>
            )}

            {wizardData.phase === "connect" && (
              <>
                {/* Empty state when no OAuth is needed */}
                {wizardData.availableProviders.length === 0 ? (
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
                      {isFinalizing ? (
                        <>
                          <h3 className="text-lg font-medium text-green-800 mb-2">
                            Finalizing agent setup…
                          </h3>
                          <p className="text-green-700">
                            The system is resolving any remaining configuration.
                          </p>
                        </>
                      ) : (
                        <>
                          <h3 className="text-lg font-medium text-green-800 mb-2">
                            All Integrations Ready!
                          </h3>
                          <p className="text-green-700">
                            No additional OAuth connections are required for your AI
                            employee. All necessary integrations are already in
                            place.
                          </p>
                        </>
                      )}
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
                        {wizardData.availableProviders.every((p) => p.connectionStatus === "connected") && (
                          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                              <span className="text-blue-700 text-sm">Finalizing agent setup…</span>
                            </div>
                          </div>
                        )}
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
                {wizardData.availableProviders.length === 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                    <p className="text-sm text-blue-700">
                      ✓ All required integrations are already connected. Your AI
                      employee is ready to use existing connections.
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
            Hire Your AI Employee
          </button>
        </div>
      </div>
    </div>
  );
}
