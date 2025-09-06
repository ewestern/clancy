import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Bot, TrendingUp, AlertCircle, Settings, FileText } from "lucide-react";
import {
  EmployeesApi,
  RunsApi,
  Configuration as AgentsCoreConfiguration,
  type Employee,
  type ActivityEvent,
} from "@ewestern/agents_core_sdk";
import {
  ConnectionApi,
  CapabilitiesApi,
  Configuration as ConnectHubConfiguration,
  type ProviderCapabilities,
} from "@ewestern/connect_hub_sdk";
import { useAuth } from "@clerk/react-router";
import { getEmployeeKnowledge, getEmployeeHealth } from "../api/stubs";
import EmployeeHeader from "../components/employee/EmployeeHeader";
import WorkflowOverview from "../components/employee/WorkflowOverview";
import ActivityTab from "../components/employee/ActivityTab";
import PermissionsTab from "../components/employee/PermissionsTab";
import KnowledgeTab from "../components/employee/KnowledgeTab";
import HealthMetricsWidget from "../components/employee/HealthMetrics";

interface KnowledgeItem {
  id: string;
  fact: string;
  sourceNode: string;
  lastReferenced: string;
  visibility: "public" | "finance" | "sales" | "private";
}

interface HealthMetricsData {
  successRate: number;
  avgLatency: number;
  lastError: string | null;
  sparklineData: number[];
  nextRun: string;
  isPaused: boolean;
}

// Workflow summary derived from Agent data
interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  status: string;
  triggers: string[];
  providers: string[];
  connectedProviders: string[];
}

// Provider permission based on connections and capabilities
interface ProviderPermission {
  provider: string;
  providerId: string;
  connected: boolean;
  connectionId?: string;
  capabilities: Array<{
    id: string;
    displayName: string;
    description?: string;
    granted: boolean;
    required: boolean;
  }>;
}

const AIEmployeeProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getToken } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);

  // Check URL params for initial tab, run filter, and workflow filter
  const initialTab =
    (searchParams.get("tab") as "activity" | "permissions" | "knowledge") ||
    "activity";
  const filterRunId = searchParams.get("run");
  const filterWorkflowId = searchParams.get("workflow");

  const [activeTab, setActiveTab] = useState<
    "activity" | "permissions" | "knowledge"
  >(initialTab);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [permissions, setPermissions] = useState<ProviderPermission[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [health, setHealth] = useState<HealthMetricsData | null>(null);

  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(
    filterWorkflowId,
  );
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [errors, setErrors] = useState<{
    employee?: string;
    connections?: string;
    capabilities?: string;
    activity?: string;
    knowledge?: string;
    health?: string;
  }>({});
  const [loadingStates, setLoadingStates] = useState<{
    employee: boolean;
    connections: boolean;
    capabilities: boolean;
    activity: boolean;
    knowledge: boolean;
    health: boolean;
  }>({
    employee: true,
    connections: true,
    capabilities: true,
    activity: true,
    knowledge: true,
    health: true,
  });

  const getAgentsCoreClient = useCallback(() => {
    return new AgentsCoreConfiguration({
      basePath: import.meta.env.VITE_AGENTS_CORE_URL,
      accessToken: getToken() as Promise<string>,
    });
  }, [getToken]);

  const getConnectHubClient = useCallback(() => {
    return new ConnectHubConfiguration({
      basePath: import.meta.env.VITE_CONNECT_HUB_URL,
      accessToken: getToken() as Promise<string>,
    });
  }, [getToken]);

  const retryFailedCall = async (errorKey: keyof typeof errors) => {
    if (!id) return;

    const agentsCoreConfig = getAgentsCoreClient();

    setErrors((prev) => ({ ...prev, [errorKey]: undefined }));

    switch (errorKey) {
      case "activity":
        setLoadingStates((prev) => ({ ...prev, activity: true }));
        try {
          const runsApi = new RunsApi(agentsCoreConfig);
          const activityData = await runsApi.v1RunsEventsGet({
            employeeId: id,
            agentId: selectedWorkflow || undefined,
            limit: 50,
          });
          setActivity(activityData);
        } catch {
          setErrors((prev) => ({
            ...prev,
            activity: "Failed to load activity information.",
          }));
        } finally {
          setLoadingStates((prev) => ({ ...prev, activity: false }));
        }
        break;

      case "knowledge":
        setLoadingStates((prev) => ({ ...prev, knowledge: true }));
        try {
          const knowledgeData = await getEmployeeKnowledge(id);
          setKnowledge(knowledgeData);
        } catch {
          setErrors((prev) => ({
            ...prev,
            knowledge: "Failed to load knowledge information.",
          }));
        } finally {
          setLoadingStates((prev) => ({ ...prev, knowledge: false }));
        }
        break;

      case "health":
        setLoadingStates((prev) => ({ ...prev, health: true }));
        try {
          const healthData = await getEmployeeHealth(id);
          setHealth(healthData);
        } catch {
          setErrors((prev) => ({
            ...prev,
            health: "Failed to load health metrics.",
          }));
        } finally {
          setLoadingStates((prev) => ({ ...prev, health: false }));
        }
        break;

      case "connections":
      case "capabilities":
        // Reload the entire page for connection/capability errors since they affect permissions
        window.location.reload();
        break;
    }
  };

  useEffect(() => {
    const loadEmployee = async () => {
      if (!id) return;

      try {
        const agentsCoreConfig = getAgentsCoreClient();
        const connectHubConfig = getConnectHubClient();

        const employeesApi = new EmployeesApi(agentsCoreConfig);
        const connectionApi = new ConnectionApi(connectHubConfig);
        const capabilitiesApi = new CapabilitiesApi(connectHubConfig);
        const runsApi = new RunsApi(agentsCoreConfig);

        // Load employee data first - this is critical
        setLoadingStates((prev) => ({ ...prev, employee: true }));
        const employeeData = await employeesApi.v1EmployeesIdGet({ id });
        setEmployee(employeeData);
        setLoadingStates((prev) => ({ ...prev, employee: false }));

        // Load other data in parallel, handling failures gracefully
        const [
          connectionsResult,
          capabilitiesResult,
          activityResult,
          knowledgeResult,
          healthResult,
        ] = await Promise.allSettled([
          connectionApi.connectionsGet(),
          capabilitiesApi.capabilitiesGet(),
          runsApi.v1RunsEventsGet({
            employeeId: id,
            agentId: selectedWorkflow || undefined,
            limit: 50,
          }),
          getEmployeeKnowledge(id),
          getEmployeeHealth(id),
        ]);

        // Handle connections
        if (connectionsResult.status === "fulfilled") {
          setLoadingStates((prev) => ({ ...prev, connections: false }));
          setErrors((prev) => ({ ...prev, connections: undefined }));
        } else {
          console.error(
            "Failed to load connections:",
            connectionsResult.reason,
          );
          setErrors((prev) => ({
            ...prev,
            connections: "Failed to load connection information.",
          }));
          setLoadingStates((prev) => ({ ...prev, connections: false }));
        }

        // Handle capabilities
        if (capabilitiesResult.status === "fulfilled") {
          setLoadingStates((prev) => ({ ...prev, capabilities: false }));
          setErrors((prev) => ({ ...prev, capabilities: undefined }));
        } else {
          console.error(
            "Failed to load capabilities:",
            capabilitiesResult.reason,
          );
          setErrors((prev) => ({
            ...prev,
            capabilities: "Failed to load capability information.",
          }));
          setLoadingStates((prev) => ({ ...prev, capabilities: false }));
        }

        // Handle activity
        if (activityResult.status === "fulfilled") {
          setActivity(activityResult.value);
          setLoadingStates((prev) => ({ ...prev, activity: false }));
          setErrors((prev) => ({ ...prev, activity: undefined }));
        } else {
          console.error("Failed to load activity:", activityResult.reason);
          setErrors((prev) => ({
            ...prev,
            activity: "Failed to load activity information.",
          }));
          setLoadingStates((prev) => ({ ...prev, activity: false }));
        }

        // Handle knowledge
        if (knowledgeResult.status === "fulfilled") {
          setKnowledge(knowledgeResult.value);
          setLoadingStates((prev) => ({ ...prev, knowledge: false }));
          setErrors((prev) => ({ ...prev, knowledge: undefined }));
        } else {
          console.error("Failed to load knowledge:", knowledgeResult.reason);
          setErrors((prev) => ({
            ...prev,
            knowledge: "Failed to load knowledge information.",
          }));
          setLoadingStates((prev) => ({ ...prev, knowledge: false }));
        }

        // Handle health
        if (healthResult.status === "fulfilled") {
          setHealth(healthResult.value);
          setLoadingStates((prev) => ({ ...prev, health: false }));
          setErrors((prev) => ({ ...prev, health: undefined }));
        } else {
          console.error("Failed to load health metrics:", healthResult.reason);
          setErrors((prev) => ({
            ...prev,
            health: "Failed to load health metrics.",
          }));
          setLoadingStates((prev) => ({ ...prev, health: false }));
        }

        // Process workflows and permissions
        const connectionsData =
          connectionsResult.status === "fulfilled"
            ? connectionsResult.value.data
            : [];
        const capabilitiesData =
          capabilitiesResult.status === "fulfilled"
            ? capabilitiesResult.value
            : [];

        // Transform agents into workflows
        const workflowSummaries: WorkflowSummary[] = employeeData.agents.map(
          (agent) => {
            const uniqueProviders = Array.from(
              new Set(agent.capabilities.map((cap) => cap.providerId)),
            );
            const connectedProviders = uniqueProviders.filter((providerId) =>
              connectionsData.some(
                (conn) =>
                  conn.providerId === providerId && conn.status === "active",
              ),
            );

            return {
              id: agent.id || "",
              name: agent.name,
              description: agent.description,
              status: agent.status,
              triggers: [agent.trigger.id],
              providers: uniqueProviders,
              connectedProviders,
            };
          },
        );
        setWorkflows(workflowSummaries);

        // Transform connections and capabilities into permissions
        const providerCapabilityMap = capabilitiesData.reduce(
          (acc, provider) => {
            acc[provider.id] = provider;
            return acc;
          },
          {} as Record<string, ProviderCapabilities>,
        );

        const allRequiredProviders = Array.from(
          new Set(
            employeeData.agents.flatMap((agent) =>
              agent.capabilities.map((cap) => cap.providerId),
            ),
          ),
        );

        const permissionSummaries: ProviderPermission[] =
          allRequiredProviders.map((providerId) => {
            const connection = connectionsData.find(
              (conn) => conn.providerId === providerId,
            );
            const providerCapabilities = providerCapabilityMap[providerId];

            // Required capabilities for this employee
            const requiredCapabilities = Array.from(
              new Set(
                employeeData.agents.flatMap((agent) =>
                  agent.capabilities
                    .filter((cap) => cap.providerId === providerId)
                    .map((cap) => cap.id),
                ),
              ),
            );

            const capabilities = requiredCapabilities.map((capId) => {
              const capInfo = providerCapabilities?.capabilities?.find(
                (cap) => cap.id === capId,
              );
              const grantedByPermissions =
                connection?.permissions?.some(
                  (perm) => perm === `${providerId}/${capId}`,
                ) || false;

              return {
                id: capId,
                displayName: capInfo?.displayName || capId,
                description: capInfo?.description,
                granted: grantedByPermissions,
                required: true,
              };
            });

            return {
              provider: connection?.displayName || providerId,
              providerId,
              connected: connection?.status === "active",
              connectionId: connection?.id,
              capabilities,
            };
          });
        setPermissions(permissionSummaries);
      } catch (error) {
        console.error("Failed to load employee:", error);
        setErrors((prev) => ({
          ...prev,
          employee:
            "Failed to load employee information. Please try refreshing the page.",
        }));
        setLoadingStates((prev) => ({ ...prev, employee: false }));
      }
    };

    loadEmployee();
  }, [id, selectedWorkflow, getAgentsCoreClient, getConnectHubClient]);

  const handleWorkflowFilter = (workflowId: string | null) => {
    setSelectedWorkflow(workflowId);
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (workflowId) {
      newParams.set("workflow", workflowId);
    } else {
      newParams.delete("workflow");
    }
    navigate({ search: newParams.toString() }, { replace: true });
  };

  if (loadingStates.employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-slate-600">
          Loading employee information...
        </span>
      </div>
    );
  }

  if (errors.employee) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-red-800 mb-2">
            Unable to Load Employee
          </h3>
          <p className="text-red-700 mb-4">{errors.employee}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-8">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 max-w-md mx-auto">
          <Bot className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">
            Employee Not Found
          </h3>
          <p className="text-slate-600 mb-4">
            The requested employee could not be found.
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Band */}
      <EmployeeHeader employee={employee} />

      {/* Workflow Overview */}
      <WorkflowOverview workflows={workflows} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="border-b border-slate-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: "activity", label: "Activity", icon: TrendingUp },
                  { id: "permissions", label: "Permissions", icon: Settings },
                  { id: "knowledge", label: "Knowledge", icon: FileText },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() =>
                      setActiveTab(
                        id as "activity" | "permissions" | "knowledge",
                      )
                    }
                    className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm ${
                      activeTab === id
                        ? "border-primary-600 text-primary-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Activity Tab */}
              {activeTab === "activity" && (
                <ActivityTab
                  activity={activity}
                  workflows={workflows}
                  selectedWorkflow={selectedWorkflow}
                  filterRunId={filterRunId}
                  loading={loadingStates.activity}
                  error={errors.activity}
                  onWorkflowFilter={handleWorkflowFilter}
                  onRetry={() => retryFailedCall("activity")}
                />
              )}

              {/* Permissions Tab */}
              {activeTab === "permissions" && (
                <PermissionsTab
                  permissions={permissions}
                  connectionsError={errors.connections}
                  capabilitiesError={errors.capabilities}
                />
              )}

              {/* Knowledge Tab */}
              {activeTab === "knowledge" && (
                <KnowledgeTab
                  knowledge={knowledge}
                  loading={loadingStates.knowledge}
                  error={errors.knowledge}
                  onRetry={() => retryFailedCall("knowledge")}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Health Widget */}
          <HealthMetricsWidget
            health={health}
            loading={loadingStates.health}
            error={errors.health}
            onRetry={() => retryFailedCall("health")}
          />
        </div>
      </div>
    </div>
  );
};

export default AIEmployeeProfile;
