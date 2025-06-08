import { ProviderRuntime, Capability, CapabilityFactory, Webhook } from "../providers/types.js";
import { ProviderAuth, ProviderKind } from "../models/capabilities.js";
import { TriggerRegistration } from "../models/triggers.js";
import { getKnowledgeSearchCapability, getKnowledgeWriteCapability } from "./internal/knowledge.js";
import { FastifyRequestTypeBox, FastifyReplyTypeBox } from "../types/fastify.js";
import { getEmailSendCapability } from "./internal/emailSend.js";
import { EventSchema, EventType, Event } from "@clancy/events";
import { Database } from "../plugins/database.js";
import { FastifySchema } from "fastify";

// @ts-ignore
export const InternalWebhookEndpoint = {
  tags: ["webhooks"],
  description: "Internal webhook",
  body: EventSchema,
};

const webhooks: Webhook<typeof InternalWebhookEndpoint, Event>[] = [
  {
    eventSchema: EventSchema,
    triggers: [{
      id: "websocket.message",
      description: "An agent is sending a message to the websocket",
      getTriggerRegistrations: async (db: Database, triggerId: string, event: Event) => {
        return [{

        }];
      },
      createEvents: async (event: Event, triggerRegistration: TriggerRegistration) => {
        return [];
      },
    }],
    validateRequest: async (request: FastifyRequestTypeBox<typeof InternalWebhookEndpoint>) => {
      return true;
    },
  },
];
//--------------------------------------------------------------------
// InternalProvider runtime
//--------------------------------------------------------------------
export class InternalProvider implements ProviderRuntime {
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
    };

    // Populate dispatch table
    for (const [capabilityId, factory] of Object.entries(capabilityFactories)) {
      this.dispatchTable.set(capabilityId, factory());
    }

    // Generate scopeMapping from dispatch table
    this.scopeMapping = {};
    for (const [capabilityId, capability] of this.dispatchTable) {
      for (const scope of capability.meta.requiredScopes) {
        if (!this.scopeMapping[scope]) {
          this.scopeMapping[scope] = [];
        }
        this.scopeMapping[scope].push(scope);
      }
    }
  }
  webhooks?: Webhook<typeof InternalWebhookEndpoint, unknown>[] = webhooks;

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


}
