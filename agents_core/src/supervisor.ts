import { v4 as generateUuid } from "uuid";
import type { Trigger, AgentContext, RunIntentEvent } from "./types/index.js";
import type { MemorySystem } from "./memory.js";
import type { AgentRegistry } from "./registry.js";
import type { IntentEmitter } from "./intentEmitter.js";

export class SupervisorAgent {
  constructor(
    private memory: MemorySystem,
    private registry: AgentRegistry,
    private intentEmitter: IntentEmitter,
  ) {}

  async processTrigger(trigger: Trigger): Promise<string[]> {
    // 1. Route trigger to determine which agents should handle it
    const targetAgentIds = await this.routeToAgents(trigger);

    // 2. For each target agent, emit runIntent event
    const executionIds: string[] = [];

    for (const agentId of targetAgentIds) {
      const executionId = await this.emitRunIntent(agentId, trigger);
      executionIds.push(executionId);
    }

    return executionIds;
  }

  private async routeToAgents(trigger: Trigger): Promise<string[]> {
    // Simple routing logic - in a real implementation, this would be more sophisticated
    switch (trigger.type) {
      case "direct_command":
        // Find agents based on the command content and required capabilities
        return await this.registry.findAgentsForCapabilities(
          trigger.organizationId,
          this.extractRequiredCapabilities(trigger.payload),
        );

      case "schedule":
        // Find scheduled agents for this organization
        return await this.registry.findScheduledAgents(trigger.organizationId);

      case "external_event":
      case "internal_event":
        // Find agents that handle events of this type
        return await this.registry.findEventHandlers(
          trigger.organizationId,
          trigger.source,
        );

      default:
        return [];
    }
  }

  private async emitRunIntent(
    agentId: string,
    trigger: Trigger,
  ): Promise<string> {
    const executionId = generateUuid();

    // Load agent context
    const context = await this.memory.getAgentContext(agentId);

    // Get agent specification
    const agent = await this.registry.getAgent(agentId);

    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Create runIntent event
    const runIntentEvent: RunIntentEvent = {
      eventId: generateUuid(),
      type: "runIntent",
      orgId: trigger.organizationId,
      agentId,
      executionId,
      trigger,
      context,
      graphSpec: {
        id: agent.agentId,
        name: agent.role,
        description: `Agent for ${agent.role}`,
        category: "general",
        nodes: [], // TODO: Convert agent capabilities to nodes
        edges: [],
        specification: agent.metadata!,
      },
      timestamp: new Date().toISOString(),
    };

    // Emit to event bus
    await this.intentEmitter.emitRunIntent(runIntentEvent);

    return executionId;
  }

  private extractRequiredCapabilities(payload: Record<string, any>): string[] {
    // Simple capability extraction - in reality this would use NLP/LLM
    const capabilities: string[] = [];

    const content = JSON.stringify(payload).toLowerCase();

    if (content.includes("calendar") || content.includes("schedule")) {
      capabilities.push("calendar");
    }
    if (content.includes("email") || content.includes("message")) {
      capabilities.push("communication");
    }
    if (content.includes("travel") || content.includes("flight")) {
      capabilities.push("travel");
    }
    if (content.includes("finance") || content.includes("budget")) {
      capabilities.push("finance");
    }

    return capabilities.length > 0 ? capabilities : ["general"];
  }
}
