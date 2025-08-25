import React from "react";
import { Zap, Shield } from "lucide-react";

// Workflow summary derived from Agent data
interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  status: string;
  triggers: string[];
  providers: string[];
}

interface WorkflowOverviewProps {
  workflows: WorkflowSummary[];
}

const WorkflowOverview: React.FC<WorkflowOverviewProps> = ({ workflows }) => {
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

  if (!workflows || workflows.length === 0) {
    return null;
  }

  return (
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
          //const status = getWorkflowStatus(workflow);
          //const status = "active";
          //const missingProviders = workflow.providers.filter(
          //  (p) => !workflow.connectedProviders.includes(p),
          //);

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
                  {/*
                  {status === "needs-connection"
                    ? "Needs connection"
                    : status}
                  */}
                  Active
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
                      className="ml-1 px-1 rounded bg-emerald-100 text-emerald-700"
                    >
                      {provider}
                    </span>
                  ))}
                </div>
              </div>

              {/*
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
              */}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowOverview;
