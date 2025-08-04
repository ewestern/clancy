import { Bot } from "lucide-react";
import { clsx } from "clsx";
import { Static } from "@sinclair/typebox";
import { AgentSchema } from "@ewestern/events";
import { ProviderCapabilities, Trigger } from "@ewestern/connect_hub_sdk";

// Agent type from events
type Agent = Static<typeof AgentSchema>;

interface AgentCardProps {
  agent: Agent;
  providers?: Record<string, ProviderCapabilities>;
  triggers?: Record<string, Trigger>;
}

export function AgentCard({
  agent,
  providers = {},
  triggers = {},
}: AgentCardProps) {
  // Sequential color cycling based on agent name
  const getSequentialColor = (name: string) => {
    const colors = [
      "bg-emerald-500",
      "bg-indigo-500",
      "bg-blue-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-slate-500",
      "bg-rose-500",
      "bg-teal-500",
      "bg-amber-500",
      "bg-cyan-500",
    ];

    // Simple hash of the name to pick a color
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Get unique providers for this agent
  const getUniqueProviders = (agent: Agent) => {
    const uniqueProviderIds = Array.from(
      new Set(agent.capabilities.map((cap) => cap.providerId)),
    );
    return uniqueProviderIds
      .map((providerId) => providers[providerId])
      .filter(Boolean);
  };

  // Get trigger description
  const getTriggerDescription = (agent: Agent) => {
    return triggers[agent.trigger.id]?.description || agent.trigger.id;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      {/* Header strip */}
      <div
        className={clsx(
          "h-4 rounded-t-lg bg-gradient-to-r to-slate-100",
          getSequentialColor(agent.name),
        )}
      ></div>

      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Left column - Avatar */}
          <div className="flex-shrink-0 relative">
            <div
              className={clsx(
                "w-14 h-14 rounded-full flex items-center justify-center",
                getSequentialColor(agent.name),
              )}
            >
              <Bot className="text-white" size={24} />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white border border-gray-200 rounded-full px-1 py-0.5 text-xs text-gray-600">
              v1.0
            </div>
          </div>

          {/* Main body */}
          <div className="flex-1 min-w-0">
            {/* Title and subtitle */}
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {agent.name}
            </h3>
            <p className="text-sm text-gray-600 mb-3">{agent.description}</p>

            {/* Provider icons */}
            {getUniqueProviders(agent).length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-2">Uses</div>
                <div className="flex items-center gap-2">
                  {getUniqueProviders(agent).map((provider) => (
                    <div key={provider.id} className="flex items-center gap-1">
                      <img
                        src={provider.icon}
                        alt={provider.displayName}
                        className="w-6 h-6"
                        title={provider.displayName}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trigger section */}
            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-2">When?</div>
              <div className="text-sm text-gray-600">
                {getTriggerDescription(agent)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
