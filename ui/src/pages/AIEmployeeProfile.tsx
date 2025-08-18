import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Bot,
  TrendingUp,
  AlertCircle,
  Settings,
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Zap,
  Shield,
} from "lucide-react";
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

interface KnowledgeItem {
  id: string;
  fact: string;
  sourceNode: string;
  lastReferenced: string;
  visibility: "public" | "finance" | "sales" | "private";
}

interface HealthMetrics {
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
  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(
    filterWorkflowId,
  );
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);

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

        const [
          employeeData,
          { data: connectionsData },
          capabilitiesData,
          activityData,
          knowledgeData,
          healthData,
        ] = await Promise.all([
          employeesApi.v1EmployeesIdGet({ id }),
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

        setEmployee(employeeData);
        setActivity(activityData);
        setKnowledge(knowledgeData);
        setHealth(healthData);

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
              const isGranted =
                connection?.capabilities?.includes(capId) || false;

              return {
                id: capId,
                displayName: capInfo?.displayName || capId,
                description: capInfo?.description,
                granted: isGranted,
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
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [
    id,
    navigate,
    selectedWorkflow,
    getAgentsCoreClient,
    getConnectHubClient,
  ]);

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

  const getWorkflowStatus = (workflow: WorkflowSummary) => {
    const missingProviders = workflow.providers.filter(
      (p) => !workflow.connectedProviders.includes(p),
    );
    if (missingProviders.length > 0) return "needs-connection";
    return workflow.status;
  };

  const getWorkflowStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-800";
      case "running":
        return "bg-blue-100 text-blue-800";
      case "paused":
        return "bg-amber-100 text-amber-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "needs-connection":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-800">Employee not found</p>
      </div>
    );
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-success-500";
      case "info":
        return "bg-blue-500";
      case "warning":
        return "bg-warning-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getScopeStatusIcon = (scope: {
    granted: boolean;
    required: boolean;
  }) => {
    if (scope.required && scope.granted)
      return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    if (scope.required && !scope.granted)
      return <XCircle className="w-4 h-4 text-red-600" />;
    if (!scope.required && scope.granted)
      return <CheckCircle className="w-4 h-4 text-slate-400" />;
    return <div className="w-4 h-4 rounded-full bg-slate-200" />;
  };

  const getScopeStatusText = (scope: {
    granted: boolean;
    required: boolean;
  }) => {
    if (scope.required && scope.granted) return "Granted (Required)";
    if (scope.required && !scope.granted) return "Missing (Required)";
    if (!scope.required && scope.granted) return "Granted (Optional)";
    return "Not granted";
  };

  const getScopeStatusColor = (scope: {
    granted: boolean;
    required: boolean;
  }) => {
    if (scope.required && scope.granted)
      return "text-emerald-700 bg-emerald-50";
    if (scope.required && !scope.granted) return "text-red-700 bg-red-50";
    if (!scope.required && scope.granted) return "text-slate-700 bg-slate-50";
    return "text-slate-500 bg-slate-50";
  };

  return (
    <div className="space-y-6">
      {/* Header Band */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-semibold text-slate-800">
                  {employee.name}
                </h1>
                <span className="bg-slate-100 text-slate-600 text-sm px-2 py-1 rounded">
                  v2.3
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Overview */}
      {workflows && workflows.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              What this employee does
            </h2>
            <p className="text-slate-600">
              Automated workflows and their current status
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workflows.map((workflow) => {
              const status = getWorkflowStatus(workflow);
              const missingProviders = workflow.providers.filter(
                (p) => !workflow.connectedProviders.includes(p),
              );

              return (
                <div
                  key={workflow.id}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-slate-800">
                        {workflow.name}
                      </h3>
                      <span className="text-xs text-slate-500">
                        Agent ID: {workflow.id}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getWorkflowStatusColor(status)}`}
                    >
                      {status === "needs-connection"
                        ? "Needs connection"
                        : status}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 mb-3">
                    {workflow.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center text-xs text-slate-500">
                      <Zap className="w-3 h-3 mr-1" />
                      Triggers: {workflow.triggers.join(", ")}
                    </div>

                    <div className="flex items-center text-xs text-slate-500">
                      <Shield className="w-3 h-3 mr-1" />
                      Providers:{" "}
                      {workflow.providers.map((provider) => (
                        <span
                          key={provider}
                          className={`ml-1 px-1 rounded ${
                            workflow.connectedProviders.includes(provider)
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {provider}
                        </span>
                      ))}
                    </div>
                  </div>

                  {missingProviders.length > 0 && (
                    <div className="mt-3 p-2 bg-orange-50 rounded border border-orange-200">
                      <p className="text-xs text-orange-800">
                        Missing connections: {missingProviders.join(", ")}
                      </p>
                      <button
                        onClick={() => navigate("/connections")}
                        className="text-xs text-orange-700 hover:text-orange-900 underline mt-1"
                      >
                        Connect providers →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-slate-800">
                      Recent Activity
                    </h3>
                    {activity.length > 0 && (
                      <span className="text-sm text-slate-500">
                        {selectedWorkflow
                          ? `Filtered by workflow`
                          : `${activity.length} events`}
                      </span>
                    )}
                  </div>

                  {/* Workflow Filter Chips */}
                  {workflows && workflows.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleWorkflowFilter(null)}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${
                          !selectedWorkflow
                            ? "bg-primary-100 text-primary-800 border border-primary-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        All workflows
                      </button>
                      {workflows.map((workflow) => (
                        <button
                          key={workflow.id}
                          onClick={() => handleWorkflowFilter(workflow.id)}
                          className={`px-3 py-1 text-sm rounded-full transition-colors ${
                            selectedWorkflow === workflow.id
                              ? "bg-primary-100 text-primary-800 border border-primary-200"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {workflow.name}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3">
                    {activity.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <p>
                          No activity found
                          {selectedWorkflow ? " for this workflow" : ""}
                        </p>
                      </div>
                    ) : (
                      activity.map((event) => {
                        const isHighlighted =
                          filterRunId && event.runId === filterRunId;
                        return (
                          <div
                            key={event.id}
                            className={`flex items-start space-x-3 p-3 rounded-lg transition-colors border ${
                              isHighlighted
                                ? "bg-primary-50 border-primary-200"
                                : "border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div
                              className={`w-3 h-3 rounded-full mt-2 ${getEventColor(event.type)}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  {event.workflowName && (
                                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                      {event.workflowName}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-500">
                                  {new Date(event.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 mt-1">
                                {event.message}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                {event.durationMs && (
                                  <span className="text-xs text-slate-400">
                                    Completed in{" "}
                                    {(event.durationMs / 1000).toFixed(1)}s
                                  </span>
                                )}
                                {event.runId && (
                                  <span className="text-xs text-slate-400">
                                    Run: {event.runId}
                                  </span>
                                )}
                              </div>
                              {isHighlighted && (
                                <div className="mt-2">
                                  <span className="inline-flex items-center px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded">
                                    🎯 Highlighted run
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Permissions Tab */}
              {activeTab === "permissions" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-slate-800">
                      Provider Permissions
                    </h3>
                    <button
                      onClick={() => navigate("/connections")}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Manage Connections →
                    </button>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-blue-800">
                          This employee requires permissions from external
                          providers to function.
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          To connect or manage permissions, visit your{" "}
                          <button
                            onClick={() => navigate("/connections")}
                            className="underline hover:no-underline font-medium"
                          >
                            Connections page
                          </button>
                          .
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {permissions.map((provider) => {
                      const hasRequiredMissing = provider.capabilities.some(
                        (c) => c.required && !c.granted,
                      );

                      return (
                        <div
                          key={provider.providerId}
                          className={`border rounded-lg p-4 ${
                            hasRequiredMissing
                              ? "border-red-200 bg-red-50"
                              : "border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-lg">
                                <Settings className="w-5 h-5 text-slate-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-slate-800">
                                  {provider.provider}
                                </h4>
                                <p className="text-sm text-slate-600">
                                  {
                                    provider.capabilities.filter(
                                      (c) => c.granted,
                                    ).length
                                  }{" "}
                                  of {provider.capabilities.length} capabilities
                                  granted
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  provider.connected
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {provider.connected
                                  ? "Connected"
                                  : "Disconnected"}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {provider.capabilities.map((capability, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between py-2 px-3 bg-white rounded border border-slate-100"
                              >
                                <div className="flex items-center space-x-3">
                                  {getScopeStatusIcon(capability)}
                                  <div>
                                    <p className="text-sm font-medium text-slate-800">
                                      {capability.displayName}
                                    </p>
                                    <p className="text-xs text-slate-600">
                                      {capability.description || capability.id}
                                    </p>
                                  </div>
                                </div>

                                <span
                                  className={`text-xs px-2 py-1 rounded ${getScopeStatusColor(capability)}`}
                                >
                                  {getScopeStatusText(capability)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {hasRequiredMissing && (
                            <div className="mt-3 p-3 bg-red-100 rounded border border-red-200">
                              <p className="text-sm text-red-800">
                                <strong>Action required:</strong> Some workflows
                                cannot run without missing required
                                capabilities.
                              </p>
                              <button
                                onClick={() => navigate("/connections")}
                                className="text-sm text-red-700 hover:text-red-900 underline mt-1 font-medium"
                              >
                                Go to Connections to fix →
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Knowledge Tab */}
              {activeTab === "knowledge" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-slate-800">
                      Knowledge Base
                    </h3>
                    <div className="flex items-center space-x-2">
                      <select className="text-sm border border-slate-300 rounded px-3 py-1">
                        <option>All scopes</option>
                        <option>Finance</option>
                        <option>Sales</option>
                        <option>Public</option>
                      </select>
                      <input
                        type="date"
                        className="text-sm border border-slate-300 rounded px-3 py-1"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Fact
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Source Node
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Last Referenced
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Visibility
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {knowledge.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                              {item.fact}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                              {item.sourceNode}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                              {item.lastReferenced}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  item.visibility === "public"
                                    ? "bg-green-100 text-green-800"
                                    : item.visibility === "finance"
                                      ? "bg-blue-100 text-blue-800"
                                      : item.visibility === "sales"
                                        ? "bg-purple-100 text-purple-800"
                                        : "bg-slate-100 text-slate-800"
                                }`}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                {item.visibility}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Health Widget */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-medium text-slate-800 mb-4">
              Health Metrics
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">
                    Success Rate (30d)
                  </span>
                  <span className="text-sm font-medium text-slate-800">
                    {health?.successRate}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-success-500 h-2 rounded-full"
                    style={{ width: `${health?.successRate}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Avg Latency</span>
                  <span className="text-sm font-medium text-slate-800">
                    {health?.avgLatency}ms
                  </span>
                </div>
              </div>

              {health?.lastError && (
                <div className="mt-4">
                  <button className="flex items-center space-x-2 text-sm text-red-600 hover:text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    <span>Last error</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIEmployeeProfile;
