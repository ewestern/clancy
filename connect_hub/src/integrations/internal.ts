import {
  ProviderRuntime,
  Capability,
  CapabilityFactory,
  Trigger,
} from "../providers/types.js";
import { BaseProvider } from "../providers/base.js";
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
import { getWebSearchCapability } from "./internal/webSearch.js";
import { FastifyRequestTypeBox } from "../types/fastify.js";
import { getEmailSendCapability } from "./internal/emailSend.js";
import { getSmsSendCapability, smsIncomingTrigger } from "./internal/twilioSms.js";
import { getVoiceCallPlaceCapability, voiceIncomingTrigger } from "./internal/twilioVoice.js";
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
  body: Type.Record(Type.String(), Type.Any()),
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

export const cronTrigger: Trigger<Record<string, any>> = {
  id: "cron",
  description: "Executes a workflow on a schedule",
  displayName: "Scheduled Workflow",
  paramsSchema: cronTriggerParamsSchema,
  eventDetailsSchema: Type.Record(Type.String(), Type.Any()),
  renderTriggerDefinition: (trigger, triggerRegistration) => {
    const cronExpression = CronExpressionParser.parse(
      triggerRegistration.params.schedule,
    );
    return `Runs on a schedule: ${humanFriendlyCron(cronExpression)}`;
  },

  getTriggerRegistrations: async (
    db: Database,
    triggerId: string,
    event: Record<string, any>,
    headers: Record<string, any>,
  ) => {
    const registrations = await db
      .select()
      .from(triggerRegistrations)
      .where(eq(triggerRegistrations.triggerId, triggerId));
    return registrations.map((registration) => ({
      ...registration,
      expiresAt: registration.expiresAt?.toISOString(),
      createdAt: registration.createdAt.toISOString(),
      updatedAt: registration.updatedAt.toISOString(),
    }));
  },
  createEvents: async (
    event: Record<string, any>,
    headers: Record<string, any>,
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
            type: EventType.RunIntent,
            timestamp: new Date().toISOString(),
            orgId: triggerRegistration.orgId,
            agentId: triggerRegistration.agentId,
            executionId: `exec-internal.cron-${new Date().toISOString()}`,
            userId: triggerRegistration.connection?.userId!,
            details: event,
          },
          partitionKey: triggerRegistration.id!,
        },
      ];
    } catch (error) {
      console.error(error);
      return [];
    }
  },
  eventSatisfies: (event: Record<string, any>, headers) => {
    if (event["detail-type"] === "Scheduled Event") {
      return true;
    }
    return false;
  },
};
const triggers = [cronTrigger, smsIncomingTrigger, voiceIncomingTrigger];

const webhooks = [
  {
    eventSchema: InternalWebhookEndpoint,
    triggers: [cronTrigger, smsIncomingTrigger, voiceIncomingTrigger],
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

export class InternalProvider extends BaseProvider<
  typeof InternalWebhookEndpoint,
  Record<string, any>
> {
  constructor() {
    super({
      metadata: {
        id: "internal",
        displayName: "Clancy Internal Services",
        description:
          "First-party services that do not require external OAuth credentials.",
        icon: "https://www.clancyai.com/favicon.svg",
        kind: ProviderKind.Internal,
        auth: ProviderAuth.None,
      },
      capabilityFactories: {
        "email.send": getEmailSendCapability,
        "sms.send": getSmsSendCapability,
        "voice.call.place": getVoiceCallPlaceCapability,
        "web.search": getWebSearchCapability,
        "knowledge.search": getKnowledgeSearchCapability,
        "knowledge.write": getKnowledgeWriteCapability,
        "memory.store": getMemoryStoreCapability,
        "memory.retrieve": getMemoryRetrieveCapability,
        "memory.update": getMemoryUpdateCapability,
        "memory.delete": getMemoryDeleteCapability,
      },
      webhooks,
      triggers,
    });
  }
}
