import { AlertCircle } from "lucide-react";
import { Static } from "@sinclair/typebox";
import { AgentSchema } from "@ewestern/events";
import { Trigger, ProviderCapabilities } from "@ewestern/connect_hub_sdk";
import { AgentCard } from "./AgentCard";

// Agent type from events
type Agent = Static<typeof AgentSchema>;

// Unsatisfied workflow display for connect phase
interface UnsatisfiedWorkflow {
  description: string;
  explanation: string;
}

interface AgentConnectDisplayProps {
  agents: Agent[];
  unsatisfiedWorkflows: UnsatisfiedWorkflow[];
  providerCapabilities: Record<string, ProviderCapabilities>;
  triggers: Record<string, Trigger>;
}

export function AgentConnectDisplay({
  agents,
  unsatisfiedWorkflows,
  providerCapabilities,
  triggers,
}: AgentConnectDisplayProps) {
  console.log("AGENTS 2", agents);

  return (
    <div className="space-y-6">
      {/* Agent Cards */}
      {agents.length > 0 && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                providers={providerCapabilities}
                triggers={triggers}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unsatisfied Workflows */}
      {unsatisfiedWorkflows.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
            <AlertCircle className="mr-2 text-amber-500" size={18} />
            Workflows Requiring Attention ({unsatisfiedWorkflows.length})
          </h4>
          <div className="space-y-3">
            {unsatisfiedWorkflows.map((workflow, index) => (
              <div
                key={index}
                className="bg-amber-50 rounded-lg p-4 border border-amber-200"
              >
                <h5 className="font-medium text-gray-900 mb-2">
                  {workflow.description}
                </h5>
                <p className="text-sm text-amber-800">{workflow.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {agents.length === 0 && unsatisfiedWorkflows.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No agent data available yet.</p>
        </div>
      )}
    </div>
  );
}

export type { UnsatisfiedWorkflow };
