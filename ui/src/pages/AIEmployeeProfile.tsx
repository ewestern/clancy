import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Bot,
  Play,
  Pause,
  TrendingUp,
  AlertCircle,
  Settings,
  FileText,
  Eye,
} from "lucide-react";
import { AIEmployee } from "../types";
import {
  getAIEmployee,
  getEmployeeActivity,
  getEmployeePermissions,
  getEmployeeKnowledge,
  getEmployeeHealth,
} from "../api/stubs";

interface ActivityEvent {
  id: string;
  timestamp: string;
  type: "success" | "info" | "warning" | "error";
  node: string;
  message: string;
  duration?: string;
  runId?: string;
}

interface Permission {
  id: string;
  provider: string;
  scope: string;
  level: "none" | "read" | "write" | "admin";
  reason: string;
  connected: boolean;
}

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

const AIEmployeeProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [employee, setEmployee] = useState<AIEmployee | null>(null);

  // Check URL params for initial tab and run filter
  const initialTab =
    (searchParams.get("tab") as "activity" | "permissions" | "knowledge") ||
    "activity";
  const filterRunId = searchParams.get("run");

  const [activeTab, setActiveTab] = useState<
    "activity" | "permissions" | "knowledge"
  >(initialTab);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEmployee = async () => {
      if (!id) return;

      try {
        const [
          employeeData,
          activityData,
          permissionsData,
          knowledgeData,
          healthData,
        ] = await Promise.all([
          getAIEmployee(id),
          getEmployeeActivity(id),
          getEmployeePermissions(id),
          getEmployeeKnowledge(id),
          getEmployeeHealth(id),
        ]);

        setEmployee(employeeData);
        setActivity(activityData);
        setPermissions(permissionsData);
        setKnowledge(knowledgeData);
        setHealth(healthData);
      } catch (error) {
        console.error("Failed to load employee:", error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [id, navigate]);

  const handleTogglePause = () => {
    if (health) {
      setHealth({ ...health, isPaused: !health.isPaused });
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

  const getScopeLevel = (level: string) => {
    const levels = ["none", "read", "write", "admin"];
    return levels.indexOf(level);
  };

  const renderScopeToggle = (permission: Permission) => {
    const level = getScopeLevel(permission.level);
    return (
      <div className="flex items-center space-x-1">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full ${
              index <= level ? "bg-primary-600" : "bg-gray-200"
            }`}
          />
        ))}
      </div>
    );
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
              <p className="text-slate-600">{employee.role}</p>
            </div>
          </div>
        </div>
      </div>

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
                  <h3 className="text-lg font-medium text-slate-800">
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    {activity.map((event) => {
                      const isHighlighted =
                        filterRunId && event.runId === filterRunId;
                      return (
                        <div
                          key={event.id}
                          className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                            isHighlighted
                              ? "bg-primary-50 border-2 border-primary-200"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`w-3 h-3 rounded-full mt-2 ${getEventColor(event.type)}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-slate-800">
                                {event.node}
                              </p>
                              <span className="text-xs text-slate-500">
                                {event.timestamp}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">
                              {event.message}
                            </p>
                            {event.duration && (
                              <span className="text-xs text-slate-400">
                                Completed in {event.duration}
                              </span>
                            )}
                            {isHighlighted && (
                              <div className="mt-2">
                                <span className="inline-flex items-center px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded">
                                  ⚠️ Error occurred in this run
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Permissions Tab */}
              {activeTab === "permissions" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-slate-800">
                      Permissions & Integrations
                    </h3>
                    <button className="text-sm text-primary-600 hover:text-primary-700">
                      View Audit Log
                    </button>
                  </div>
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-primary-600 rounded flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded" />
                      </div>
                      <p className="text-sm text-primary-800">
                        Scopes default to least-privilege; widen only if
                        necessary.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                              <Settings className="w-4 h-4 text-slate-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">
                                {permission.provider}
                              </p>
                              <p className="text-sm text-slate-600">
                                {permission.reason}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          {renderScopeToggle(permission)}
                          <button
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              permission.connected
                                ? "bg-success-100 text-success-800"
                                : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                            }`}
                          >
                            {permission.connected ? "Connected" : "Connect"}
                          </button>
                        </div>
                      </div>
                    ))}
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
          {/* Next Run */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-800">Next Run</h3>
              <button
                onClick={handleTogglePause}
                className={`p-2 rounded-lg ${
                  health?.isPaused
                    ? "bg-success-100 text-success-800 hover:bg-success-200"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                }`}
              >
                {health?.isPaused ? (
                  <Play className="w-4 h-4" />
                ) : (
                  <Pause className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-slate-800 mb-1">
                {health?.nextRun || "--:--"}
              </div>
              <p className="text-sm text-slate-600">
                {health?.isPaused ? "Paused" : "Until next run"}
              </p>
            </div>
          </div>

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
