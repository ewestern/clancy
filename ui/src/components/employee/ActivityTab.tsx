import React from "react";
import { AlertCircle } from "lucide-react";
import type { ActivityEvent } from "@ewestern/agents_core_sdk";

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

interface ActivityTabProps {
  activity: ActivityEvent[];
  workflows: WorkflowSummary[];
  selectedWorkflow: string | null;
  filterRunId: string | null;
  loading: boolean;
  error: string | undefined;
  onWorkflowFilter: (workflowId: string | null) => void;
  onRetry: () => void;
}

const ActivityTab: React.FC<ActivityTabProps> = ({
  activity,
  workflows,
  selectedWorkflow,
  filterRunId,
  loading,
  error,
  onWorkflowFilter,
  onRetry,
}) => {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-800">Recent Activity</h3>
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
            <span className="text-sm text-slate-500">Loading...</span>
          </div>
        ) : activity.length > 0 ? (
          <span className="text-sm text-slate-500">
            {selectedWorkflow
              ? `Filtered by workflow`
              : `${activity.length} events`}
          </span>
        ) : null}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={onRetry}
                className="text-sm text-red-700 hover:text-red-900 underline mt-1"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Filter Chips */}
      {workflows && workflows.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onWorkflowFilter(null)}
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
              onClick={() => onWorkflowFilter(workflow.id)}
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
        {loading ? (
          <div className="text-center py-8 text-slate-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-3"></div>
            <p>Loading activity...</p>
          </div>
        ) : activity.length === 0 && !error ? (
          <div className="text-center py-8 text-slate-500">
            <p>
              No activity found
              {selectedWorkflow ? " for this workflow" : ""}
            </p>
          </div>
        ) : !error ? (
          activity.map((event) => {
            const isHighlighted = filterRunId && event.runId === filterRunId;
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
                  <p className="text-sm text-slate-600 mt-1">{event.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    {event.durationMs && (
                      <span className="text-xs text-slate-400">
                        Completed in {(event.durationMs / 1000).toFixed(1)}s
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
        ) : null}
      </div>
    </div>
  );
};

export default ActivityTab;
