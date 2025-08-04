import {
  ProviderRuntime,
  Capability,
  CapabilityFactory,
  Trigger,
} from "../providers/types.js";
import { ProviderAuth, ProviderKind } from "../models/providers.js";
import { TriggerRegistration } from "../models/triggers.js";
import {
  getKnowledgeSearchCapability,
  getKnowledgeWriteCapability,
} from "./internal/knowledge.js";
import {
  getMemoryStoreCapability,
  getMemoryRetrieveCapability,
  getMemoryUpdateCapability,
  getMemoryDeleteCapability,
} from "./internal/memory.js";
import { FastifyRequestTypeBox } from "../types/fastify.js";
import { getEmailSendCapability } from "./internal/emailSend.js";
//import { EventSchema, Event, RequestHumanFeedbackEvent, EventType } from "@clancy/events";
import { EventSchema, Event, EventType } from "@ewestern/events";
import { Database } from "../plugins/database.js";
import { triggerRegistrations } from "../database/schema.js";
import { eq } from "drizzle-orm";
import { CronExpressionParser } from "cron-parser";
import { Type, Static } from "@sinclair/typebox";
import { humanFriendlyCron } from "../utils/cron.js";

// @ts-ignore
export const InternalWebhookEndpoint = {
  tags: ["webhooks"],
  description: "Internal webhook",
  body: EventSchema,
};

// Parameter schema for cron trigger
const cronTriggerParamsSchema = Type.Object({
  schedule: Type.String({
    description:
      "Cron expression defining when the trigger should fire (e.g., '0 9 * * MON-FRI' for weekdays at 9am)",
    pattern:
      "^(@(yearly|annually|monthly|weekly|daily|hourly))|(@every (\\d+(ns|us|µs|ms|s|m|h))+)|(((\\d+,)+\\d+|(\\d+(/|-)\\d+)|\\d+|\\*) ?){5,7}$",
  }),
});

const cronTrigger: Trigger<Event> = {
  id: "cron",
  description: "Executes a workflow on a schedule",
  paramsSchema: cronTriggerParamsSchema,
  renderTriggerDefinition: (trigger, triggerRegistration) => {
    const cronExpression = CronExpressionParser.parse(
      triggerRegistration.params.schedule,
    );
    return `Runs on a schedule: ${humanFriendlyCron(cronExpression)}`;
  },

  getTriggerRegistrations: async (
    db: Database,
    triggerId: string,
    event: Event,
  ) => {
    const registrations = await db
      .select()
      .from(triggerRegistrations)
      .where(eq(triggerRegistrations.triggerId, triggerId));
    return registrations.map((registration) => ({
      ...registration,
      expiresAt: registration.expiresAt.toISOString(),
      createdAt: registration.createdAt.toISOString(),
      updatedAt: registration.updatedAt.toISOString(),
    }));
  },
  createEvents: async (
    event: Event,
    triggerRegistration: TriggerRegistration,
  ) => {
    const metadata = triggerRegistration.params.schedule;
    try {
      const cronExpression = CronExpressionParser.parse(metadata);
      const currentDate = new Date();
      currentDate.setSeconds(0);
      currentDate.setMilliseconds(0);
      const isActive = cronExpression.includesDate(currentDate);
      if (!isActive) {
        return [];
      }
      return [
        {
          event: {
            type: EventType.Cron,
            timestamp: new Date().toISOString(),
            orgId: event.orgId,
            agentId: triggerRegistration.agentId,
          },
          partitionKey: triggerRegistration.id!,
        },
      ];
    } catch (error) {
      console.error(error);
      return [];
    }
  },
  eventSatisfies: (event: Event) => {
    return event.type === EventType.Cron;
  },
};
const triggers = [cronTrigger];

const webhooks = [
  {
    eventSchema: InternalWebhookEndpoint,
    triggers: [cronTrigger],
    validateRequest: async (
      request: FastifyRequestTypeBox<typeof InternalWebhookEndpoint>,
    ) => {
      return true;
    },
  },
];
//--------------------------------------------------------------------
// InternalProvider runtime
//--------------------------------------------------------------------

export class InternalProvider
  implements ProviderRuntime<typeof InternalWebhookEndpoint, Event>
{
  private readonly dispatchTable = new Map<string, Capability<any, any>>();
  public readonly scopeMapping: Record<string, string[]>;

  public readonly metadata = {
    id: "internal",
    displayName: "Clancy Internal Services",
    description:
      "First-party services that do not require external OAuth credentials.",
    icon: "https://raw.githubusercontent.com/twemoji/twitter-emojis/master/assets/svg/1f4bb.svg",
    kind: ProviderKind.Internal,
    auth: ProviderAuth.None,
  } as const;

  constructor() {
    // Define capability factories
    const capabilityFactories: Record<string, CapabilityFactory> = {
      "email.send": getEmailSendCapability,
      "knowledge.search": getKnowledgeSearchCapability,
      "knowledge.write": getKnowledgeWriteCapability,
      "memory.store": getMemoryStoreCapability,
      "memory.retrieve": getMemoryRetrieveCapability,
      "memory.update": getMemoryUpdateCapability,
      "memory.delete": getMemoryDeleteCapability,
    };

    // Populate dispatch table
    for (const [capabilityId, factory] of Object.entries(capabilityFactories)) {
      this.dispatchTable.set(capabilityId, factory());
    }

    // Generate scopeMapping from dispatch table
    this.scopeMapping = {};
    for (const [capabilityId, capability] of this.dispatchTable) {
      for (const scope of capability.meta.requiredScopes) {
        if (!this.scopeMapping[capabilityId]) {
          this.scopeMapping[capabilityId] = [];
        }
        this.scopeMapping[capabilityId].push(scope);
      }
    }
  }
  webhooks = webhooks;

  getCapability<P, R>(capabilityId: string): Capability<P, R> {
    const capability = this.dispatchTable.get(capabilityId);
    if (!capability) {
      throw new Error(`Internal capability '${capabilityId}' not implemented`);
    }
    return capability as Capability<P, R>;
  }

  listCapabilities() {
    return Array.from(this.dispatchTable.values()).map((c) => c.meta);
  }
  listTriggers(): Trigger<Event>[] {
    return triggers;
  }
  getTrigger(triggerId: string): Trigger<Event> | undefined {
    return triggers.find((t) => t.id === triggerId);
  }
}
