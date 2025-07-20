import { useState, useEffect, useCallback } from "react";
import {
  X,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { clsx } from "clsx";
import { ChatInterface } from "./wizard/ChatInterface";
import { ProviderCards } from "./wizard/ProviderCards";
import { SimpleWorkflowDisplay, type SimpleWorkflow } from "./wizard/SimpleWorkflowDisplay";
import { AgentConnectDisplay, type UnsatisfiedWorkflow } from "./wizard/AgentConnectDisplay";
import { PhaseProgressIndicator } from "./wizard/PhaseProgressIndicator";
import type {
  CollaborativeWizardData,
  ChatMessage,
  EventMessage,
  EnhancedWorkflow,
  ProviderCard,
} from "../types";

import type {
  Event,
  AiEmployeeUpdateEvent,
  GraphCreatorRunIntentEvent,
  RequestHumanFeedbackEvent,
  ProviderConnectionCompletedEvent,
  GraphCreatorResumeIntentEvent,
} from "@ewestern/events";
import { EventType, AgentSchema } from "@ewestern/events";
import { Static } from "@sinclair/typebox";
import { OAuthApi, Configuration, CapabilitiesApi, TriggersApi, type Trigger, type ProviderCapabilities } from "@ewestern/connect_hub_sdk";
import type { 
  OauthAuditPostRequest 
} from "@ewestern/connect_hub_sdk";
import { useWebSocketCtx } from "../context/WebSocketContext";
import { useUser, useOrganization, useAuth } from "@clerk/react-router";
import { WebsocketMessage } from "../types";

// Agent type from events
type Agent = Static<typeof AgentSchema>;



interface HiringWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: CollaborativeWizardData) => void;
}



export function HiringWizard({
  isOpen,
  onClose,
  onComplete,
}: HiringWizardProps) {

  const mockAgents: Agent[] = [
    {
      id: "agent-1",
      name: "Invoice Processing Agent",
      description: "Monthly Invoice Processing",
      trigger: {
        id: "cron",
        providerId: "internal",
        triggerParams: {}
      },
      capabilities: [
        { id: "drive.drives.list", providerId: "google" },
        { id: "gmail.messages.list", providerId: "google" }
      ],
      prompt: "You are an invoice processing assistant that handles monthly billing tasks."
    },
    {
      id: "agent-2", 
      name: "Meeting Coordination Agent",
      description: "Meeting Coordination Assistant",
      trigger: {
        id: "message.created",
        providerId: "slack",
        triggerParams: {}
      },
      capabilities: [
        { id: "chat.post", providerId: "slack" },
        { id: "gmail.messages.list", providerId: "google" }
      ],
      prompt: "You are a meeting coordination assistant that helps manage calendars and meetings."
    }
  ];

  const [wizardData, setWizardData] = useState<CollaborativeWizardData>({
    jobDescription: "",
    chatHistory: [],
    enhancedWorkflows: [],
    availableProviders: [],
    connectedProviders: [],
    phase: "job_description",
    canComplete: false,
    notifications: {
      slack: { taskComplete: true, needsReview: true, error: true },
      email: { taskComplete: false, needsReview: true, error: true },
      sms: { taskComplete: false, needsReview: false, error: true },
    },
    requireApproval: true,
    slaHours: 24,
    pinToDashboard: true,
  });

  // Store simple workflows separately for the workflows phase
  const [simpleWorkflows, setSimpleWorkflows] = useState<SimpleWorkflow[]>([]);

  // Store agents and unsatisfied workflows for the connect phase
  const [agents, setAgents] = useState<Agent[]>([]);
  const [unsatisfiedWorkflows, setUnsatisfiedWorkflows] = useState<
    UnsatisfiedWorkflow[]
  >([]);

  // Add state for capability and trigger metadata
  const [providerCapabilities, setProviderCapabilities] = useState<Record<string, ProviderCapabilities>>({});
  const [triggers, setTriggers] = useState<Record<string, Trigger>>({});

  const { send, subscribe } = useWebSocketCtx();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Track whether the AI agent has requested feedback from the user
  const [feedbackRequested, setFeedbackRequested] = useState(false);

  const { user } = useUser();
  const { organization } = useOrganization();
  const { getToken } = useAuth();

  const getAuditApi = useCallback(() => {
    return new OAuthApi(new Configuration({
      basePath: import.meta.env.VITE_CONNECT_HUB_URL!,
      accessToken: getToken() as Promise<string>,
    }));
  }, [getToken]);

  const getCapabilityApi = useCallback(() => {
    return new CapabilitiesApi(new Configuration({
      basePath: import.meta.env.VITE_CONNECT_HUB_URL!,
      accessToken: getToken() as Promise<string>,
    }));
  }, [getToken]);

  const getTriggerApi = useCallback(() => {
    return new TriggersApi(new Configuration({
      basePath: import.meta.env.VITE_CONNECT_HUB_URL!,
      accessToken: getToken() as Promise<string>,
    }));
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

        const providerCapabilityMap = capabilities.reduce((acc, providerCapability) => {
          acc[providerCapability.id] = providerCapability;
          return acc;
        }, {} as Record<string, ProviderCapabilities>);
        setProviderCapabilities(providerCapabilityMap);

        const triggerMap = triggersList.reduce((acc, trigger) => {
          acc[trigger.id] = trigger;
          return acc;
        }, {} as Record<string, Trigger>);
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
      //setWizardData((prev) => ({
      //  ...prev,
      //  jobDescription: "",
      //  chatHistory: [],
      //  enhancedWorkflows: [],
      //  availableProviders: [],
      //  connectedProviders: [],
      //  phase: "job_description",
      //  canComplete: false,
      //  executionId: undefined,
      //}));
      setWizardData((prev) => ({
        ...prev,
        jobDescription: "",
        chatHistory: [],
        enhancedWorkflows: [],
        availableProviders: [],
        connectedProviders: [],
        phase: "connect",
        canComplete: false,
        executionId: undefined,
      }));
      setSimpleWorkflows([]);
      setAgents(mockAgents);
      setUnsatisfiedWorkflows([]);
      setFeedbackRequested(false);
    }
  }, [isOpen]);

  const performOAuthAudit = useCallback(async (agents: Agent[]) => {
    if (!organization?.id) {
      console.error("No organization ID available for OAuth audit");
      return;
    }
    if ( Object.keys(providerCapabilities).length === 0) {
      return;
    }

    try {
      // Prepare the audit request
      const capabilities = agents.flatMap(agent => 
        agent.capabilities.map((cap: { id: string; providerId: string }) => ({
          providerId: cap.providerId,
          capabilityId: cap.id,
        }))
      );

      const triggers = agents.map(agent => ({
        providerId: agent.trigger.providerId,
        triggerId: agent.trigger.id,
      }));

      const auditRequest: OauthAuditPostRequest = {
        capabilities,
        triggers,
      };

      console.log("Performing OAuth audit with request:", auditRequest);
      const oauthApi = getAuditApi();

      const auditResults = await oauthApi.oauthAuditPost({
        orgId: organization.id,
        oauthAuditPostRequest: auditRequest,
      });

      console.log("OAuth audit results:", auditResults);

      const groupedCapabilities = Object.groupBy(capabilities, (cap) => cap.providerId);

      // Convert audit results to provider cards
      const providers: ProviderCard[] = auditResults
        .map(result => {
          const capabilityIds = groupedCapabilities[result.providerId]?.map(cap => cap.capabilityId) || [];
          const requiredScopes = capabilityIds?.map(cap => providerCapabilities[result.providerId].capabilities.find(c => c.id === cap)?.displayName).filter((cap): cap is string => cap !== undefined) || [];
          return {
            id: result.providerId,
            name: result.providerDisplayName, // You might want to create a mapping to friendly names
            logo: result.providerIcon,
            category: result.providerId, // Use providerId as category for now
            connectionStatus: "disconnected" as const,
            requiredScopes,
            oauthUrl: result.oauthUrl!,
          };
        });

      setWizardData(prev => ({
        ...prev,
        availableProviders: providers,
      }));

    } catch (error) {
      console.error("OAuth audit failed:", error);
      // On audit failure, proceed anyway assuming no additional connections needed
      setWizardData(prev => ({
        ...prev,
        phase: "ready",
        canComplete: true, // Default to allowing completion if audit fails
      }));
    }
  }, [getAuditApi, organization?.id, providerCapabilities]);

  // Handle OAuth audit when agents are set
  useEffect(() => {
    if (agents.length > 0 && wizardData.phase === "connect") {
      performOAuthAudit(agents);
    }
  }, [agents, wizardData.phase, performOAuthAudit]);

  const handleAiEmployeeUpdate = async (event: AiEmployeeUpdateEvent) => {
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
      // For connect phase (backend may still send "mapping"), handle agents and unsatisfied workflows
      setAgents(event.agents);
      setUnsatisfiedWorkflows(event.unsatisfiedWorkflows);
      setWizardData((prev) => ({
        ...prev,
        phase: "connect",
      }));
    } else {
      // For ready phase, convert to enhanced workflows for provider selection
      const enhancedWorkflows: EnhancedWorkflow[] = event.workflows.map(
        (workflow, index) => ({
          id: `workflow-${index}`,
          title: workflow.description,
          frequency: workflow.activation, // Use activation as frequency
          runtime: "Variable", // Default since not provided in event
          subSteps: workflow.steps.map((step) => step.description),
          connectionStatus: "requires_connection" as const,
          requiredProviders: [], // Could be derived from workflow steps or separate logic
          lastUpdated: new Date(),
          changeHighlight: true,
        }),
      );

      setWizardData((prev) => ({
        ...prev,
        phase: "ready", // Always set to ready for this final case
        enhancedWorkflows,
        canComplete: prev.availableProviders.every(p => 
          prev.connectedProviders.some(cp => cp.id === p.id)
        ), // All required providers must be connected (true if no providers needed)
      }));
    }

    setIsAnalyzing(false);
    setIsProcessing(false);
  };

  const handleProviderConnectionCompleted = (
    event: ProviderConnectionCompletedEvent,
  ) => {
    console.log("Received provider connection completed:", event);
    setIsProcessing(false);

    if (event.connectionStatus === "connected") {
      // Move provider from available to connected
      setWizardData((prev) => {
        const provider = prev.availableProviders.find(
          (p) => p.id === event.providerId,
        );
        if (!provider) return prev;

        const updatedProvider: ProviderCard = {
          ...provider,
          connectionStatus: "connected",
          accountInfo: {
            email: (event.externalAccountMetadata.email as string) || undefined,
            accountName:
              (event.externalAccountMetadata.name as string) || provider.name,
          },
        };

        const newConnectedProviders = [...prev.connectedProviders, updatedProvider];
        
        return {
          ...prev,
          availableProviders: prev.availableProviders.map((p) =>
            p.id === event.providerId ? updatedProvider : p,
          ),
          connectedProviders: newConnectedProviders,
          canComplete: prev.availableProviders.every(p => 
            newConnectedProviders.some(cp => cp.id === p.id)
          ), // All required providers must be connected (true if no providers needed)
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
  };

  const handleRequestHumanFeedback = (event: RequestHumanFeedbackEvent) => {
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
  };

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribeEvent = subscribe("event", (payload: WebsocketMessage) => {
      const eventMessage = payload as EventMessage;
      const event = eventMessage.event as Event;

      switch (event.type) {
        case EventType.AiEmployeeStateUpdate:
          handleAiEmployeeUpdate(event as AiEmployeeUpdateEvent);
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
  }, [isOpen, subscribe]);

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
        jobDescription: wizardData.jobDescription,
        executionId: executionId,
        userId: user?.id,
      } as GraphCreatorRunIntentEvent,
    });
    console.log("Job description sent to backend");
  };

  const handleSendMessage = (messageContent: string) => {
    // Only add user message to chat history - agent response will come via WebSocket
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
      } as GraphCreatorResumeIntentEvent,
    });
  };

  const handleConnectProvider = async (providerId: string) => {
    // Update provider status to connecting (optimistic update)
    const baseOauthUrl = wizardData.availableProviders.find(p => p.id === providerId)?.oauthUrl;
    if (!baseOauthUrl) {
      console.error("No OAuth URL found for provider:", providerId);
      return;
    }

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
      const launchUrl = new URL(baseOauthUrl);
      if (token) {
        launchUrl.searchParams.append("sessionToken", token);
      }

      window.open(
        launchUrl.toString(),
        "_blank",
        "width=600,height=700,scrollbars=yes,resizable=yes",
      );

      console.log(
        "Opening OAuth flow for provider:",
        providerId,
        "at:",
        launchUrl.toString(),
      );
    } catch (error) {
      console.error("Failed to obtain Clerk session token:", error);
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
        canComplete: prev.availableProviders.every(p => 
          newConnectedProviders.some(cp => cp.id === p.id)
        ), // All required providers must be connected (true if no providers needed)
      };
    });
  };

  const handleComplete = () => {
    onComplete(wizardData);
    onClose();
  };

  if (!user) {
    return <div>Please sign in to continue</div>;
  }
  console.log("PHASE", wizardData.phase);
  console.log("AGENTS", agents);
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
              <p className="text-sm text-gray-600 mt-1">
                Describe what you'd like your AI employee to do
              </p>
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
  console.log("PHASE", wizardData.phase);
  console.log("AVAILABLE PROVIDERS", wizardData.availableProviders);
  console.log("CONNECTED PROVIDERS", wizardData.connectedProviders);

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
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
              <h4 className="font-medium text-gray-900">
                Chat with the AI Employee Designer
              </h4>
              <p className="text-sm text-gray-600">
                Ask questions or provide feedback
              </p>
            </div>
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
                  </>
                ) : (
                  <PhaseProgressIndicator phase="workflows" />
                )}
              </>
            )}

            {wizardData.phase === "connect" && (
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

                {/* AI Employees Section - Second */}
                {agents.length > 0 ? (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Workflows
                      
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Your AI Employees will perform the following workflows.
                    </p>
                    <AgentConnectDisplay
                      agents={agents}
                      unsatisfiedWorkflows={unsatisfiedWorkflows}
                      providerCapabilities={providerCapabilities}
                      triggers={triggers}
                    />
                  </>
                ) : wizardData.availableProviders.length === 0 ? (
                  <PhaseProgressIndicator phase="connect" />
                ) : null}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-600">
            {wizardData.availableProviders.length > 0 ? (
              wizardData.canComplete ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle size={16} />
                  <span>
                    All required integrations connected ({wizardData.connectedProviders.length}/{wizardData.availableProviders.length})
                  </span>
                </div>
              ) : (
                <span>
                  Connect all required integrations to continue ({wizardData.connectedProviders.length}/{wizardData.availableProviders.length})
                </span>
              )
            ) : wizardData.phase === "connect" && wizardData.canComplete ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle size={16} />
                <span>No additional integrations required</span>
              </div>
            ) : (
              <span>Analyzing required integrations...</span>
            )}
          </div>

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
