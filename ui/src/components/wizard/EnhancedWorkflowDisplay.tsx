import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Calendar,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { clsx } from "clsx";
import type { EnhancedWorkflow } from "../../types";

interface EnhancedWorkflowDisplayProps {
  workflows: EnhancedWorkflow[];
  onWorkflowInteraction?: (workflowId: string, action: string) => void;
}

export function EnhancedWorkflowDisplay({
  workflows,
  onWorkflowInteraction,
}: EnhancedWorkflowDisplayProps) {
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(
    new Set(),
  );
  const [highlightedWorkflows, setHighlightedWorkflows] = useState<Set<string>>(
    new Set(),
  );

  // Handle change highlighting
  useEffect(() => {
    const changedWorkflows = new Set(
      workflows.filter((w) => w.changeHighlight).map((w) => w.id),
    );

    setHighlightedWorkflows(changedWorkflows);

    // Remove highlights after 3 seconds
    if (changedWorkflows.size > 0) {
      const timer = setTimeout(() => {
        setHighlightedWorkflows(new Set());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [workflows]);

  const toggleWorkflowExpansion = (workflowId: string) => {
    const newExpanded = new Set(expandedWorkflows);
    if (newExpanded.has(workflowId)) {
      newExpanded.delete(workflowId);
    } else {
      newExpanded.add(workflowId);
    }
    setExpandedWorkflows(newExpanded);
    onWorkflowInteraction?.(workflowId, "toggle_expand");
  };

  const getConnectionStatusInfo = (workflow: EnhancedWorkflow) => {
    switch (workflow.connectionStatus) {
      case "fully_connected":
        return {
          icon: Wifi,
          color: "text-green-600",
          bgColor: "bg-green-100",
          text: "Ready to run",
        };
      case "partially_connected":
        return {
          icon: AlertCircle,
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
          text: "Needs more connections",
        };
      case "requires_connection":
        return {
          icon: WifiOff,
          color: "text-red-600",
          bgColor: "bg-red-100",
          text: "Requires connections",
        };
      default:
        return {
          icon: WifiOff,
          color: "text-gray-600",
          bgColor: "bg-gray-100",
          text: "Not configured",
        };
    }
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (workflows.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock size={24} className="text-gray-400" />
        </div>
        <p className="text-gray-500">
          No workflows generated yet. Please provide a job description to get
          started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {workflows.map((workflow) => {
        const isExpanded = expandedWorkflows.has(workflow.id);
        const isHighlighted = highlightedWorkflows.has(workflow.id);
        const statusInfo = getConnectionStatusInfo(workflow);
        const StatusIcon = statusInfo.icon;

        return (
          <div
            key={workflow.id}
            className={clsx(
              "border rounded-lg transition-all duration-300",
              isHighlighted
                ? "border-blue-300 bg-blue-50 shadow-md"
                : "border-gray-200 bg-white shadow-sm hover:shadow-md",
            )}
          >
            <div
              className={clsx(
                "p-4 cursor-pointer transition-colors",
                isHighlighted ? "hover:bg-blue-100" : "hover:bg-gray-50",
              )}
              onClick={() => toggleWorkflowExpansion(workflow.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <h4
                      className={clsx(
                        "text-lg font-medium",
                        isHighlighted ? "text-blue-900" : "text-gray-900",
                      )}
                    >
                      {workflow.title}
                    </h4>

                    {/* Status indicator */}
                    <div
                      className={clsx(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                        statusInfo.bgColor,
                        statusInfo.color,
                      )}
                    >
                      <StatusIcon size={12} className="mr-1" />
                      {statusInfo.text}
                    </div>

                    {/* Frequency and runtime */}
                    <div className="flex items-center space-x-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        <Calendar size={12} className="mr-1" />
                        {workflow.frequency}
                      </span>

                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        <Clock size={12} className="mr-1" />
                        {workflow.runtime}
                      </span>
                    </div>
                  </div>

                  {/* Last updated */}
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                    <span>
                      Updated {formatLastUpdated(workflow.lastUpdated)}
                    </span>
                    {workflow.requiredProviders.length > 0 && (
                      <span>
                        Requires: {workflow.requiredProviders.join(", ")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="ml-4">
                  {isExpanded ? (
                    <ChevronDown size={20} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={20} className="text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded sub-steps */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">
                    Detailed steps:
                  </h5>
                  <ol className="space-y-3">
                    {workflow.subSteps.map((step, index) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-primary-600 text-white text-xs font-medium rounded-full mr-3 mt-0.5 flex-shrink-0">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <span
                            className={clsx(
                              "text-sm",
                              isHighlighted ? "text-blue-900" : "text-gray-700",
                            )}
                          >
                            {step}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>

                  {/* Connection requirements */}
                  {workflow.requiredProviders.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <h6 className="text-sm font-medium text-gray-700 mb-2">
                        Required Connections:
                      </h6>
                      <div className="flex flex-wrap gap-2">
                        {workflow.requiredProviders.map((provider, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700"
                          >
                            {provider}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Change highlight indicator */}
            {isHighlighted && (
              <div className="px-4 py-2 bg-blue-100 border-t border-blue-200">
                <div className="flex items-center space-x-2 text-blue-800">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Recently updated</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Overall status summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Workflow Status</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {
                workflows.filter(
                  (w) => w.connectionStatus === "fully_connected",
                ).length
              }
            </div>
            <div className="text-gray-600">Ready</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-yellow-600">
              {
                workflows.filter(
                  (w) => w.connectionStatus === "partially_connected",
                ).length
              }
            </div>
            <div className="text-gray-600">Partial</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">
              {
                workflows.filter(
                  (w) => w.connectionStatus === "requires_connection",
                ).length
              }
            </div>
            <div className="text-gray-600">Needs Setup</div>
          </div>
        </div>
      </div>
    </div>
  );
}
