import { Type, Static } from "@sinclair/typebox";
import {
  Capability,
  CapabilityMeta,
  CapabilityRisk,
  ExecutionContext,
  Trigger,
} from "../../providers/types.js";
import { OwnershipScope } from "../../models/shared.js";
import twilio from "twilio";
import { Type as T } from "@sinclair/typebox";
import { Database } from "../../plugins/database.js";
import { triggerRegistrations } from "../../database/schema.js";
import { eq } from "drizzle-orm";
import { TriggerRegistration } from "../../models/triggers.js";
import { EventType } from "@ewestern/events";

// -----------------------------------------------------------------------------
// Capability: sms.send
// -----------------------------------------------------------------------------

export const smsSendParamsSchema = Type.Object({
  to: Type.String({ description: "E.164 phone number of the recipient" }),
  body: Type.String({ minLength: 1 }),
  mediaUrls: Type.Optional(Type.Array(Type.String())),
  from: Type.Optional(Type.String({ description: "Override sending number" })),
  messagingServiceSid: Type.Optional(Type.String()),
});

export const smsSendResultSchema = Type.Object({
  sid: Type.String(),
  status: Type.String(),
  to: Type.String(),
  errorCode: Type.Optional(Type.Number()),
  errorMessage: Type.Optional(Type.String()),
});

export type SmsSendParams = Static<typeof smsSendParamsSchema>;
export type SmsSendResult = Static<typeof smsSendResultSchema>;

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN env var");
  }
  return twilio(accountSid, authToken);
}

async function smsSendExecute(
  params: SmsSendParams,
  ctx: ExecutionContext,
): Promise<SmsSendResult> {
  void ctx;
  const client = getTwilioClient();
  const messagingServiceSid =
    params.messagingServiceSid || process.env.TWILIO_MESSAGING_SERVICE_SID;
  const from = params.from || process.env.TWILIO_SMS_FROM;

  const createParams: any = {
    to: params.to,
    body: params.body,
  };
  if (params.mediaUrls && params.mediaUrls.length > 0) {
    createParams.mediaUrl = params.mediaUrls;
  }
  if (messagingServiceSid) {
    createParams.messagingServiceSid = messagingServiceSid;
  } else if (from) {
    createParams.from = from;
  } else {
    throw new Error(
      "Provide messagingServiceSid or from (env TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM)",
    );
  }

  const res = await client.messages.create(createParams);
  return {
    sid: res.sid,
    status: res.status ?? "queued",
    to: res.to ?? params.to,
    errorCode: res.errorCode ?? undefined,
    errorMessage: res.errorMessage ?? undefined,
  };
}

export function getSmsSendCapability(): Capability<SmsSendParams, SmsSendResult> {
  const meta: CapabilityMeta = {
    id: "sms.send",
    displayName: "Send SMS/MMS",
    description: "Send SMS/MMS via Twilio using Clancy credentials.",
    docsUrl: "https://www.twilio.com/docs/messaging/api/message-resource#create-a-message-resource",
    paramsSchema: smsSendParamsSchema,
    resultSchema: smsSendResultSchema,
    requiredScopes: [],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.HIGH,
  };

  return { meta, execute: smsSendExecute };
}

// -----------------------------------------------------------------------------
// Trigger: sms.incomingReceived
// -----------------------------------------------------------------------------

export const smsIncomingParamsSchema = Type.Object({
  to: Type.Optional(Type.String({ description: "Filter by receiving number" })),
});

export const smsIncomingEventSchema = Type.Object({
  messageSid: Type.String(),
  from: Type.String(),
  to: Type.String(),
  body: Type.Optional(Type.String()),
  raw: Type.Optional(Type.Record(Type.String(), Type.Any())),
});

export type SmsIncomingEvent = Static<typeof smsIncomingEventSchema>;

export const smsIncomingTrigger: Trigger<Record<string, any>> = {
  id: "sms.incomingReceived",
  displayName: "Incoming SMS Received",
  description: "Fires when a Twilio number receives an SMS/MMS.",
  paramsSchema: smsIncomingParamsSchema,
  eventDetailsSchema: smsIncomingEventSchema,
  renderTriggerDefinition: (trigger, registration) => {
    if (registration.params.to) {
      return `Incoming SMS to ${registration.params.to}`;
    }
    return "Incoming SMS on any configured number";
  },
  eventSatisfies: (event) => {
    // Twilio inbound SMS typically contains MessageSid, From, To, Body and SmsStatus=received
    return (
      typeof event === "object" &&
      event !== null &&
      typeof (event as any)["MessageSid"] === "string" &&
      typeof (event as any)["From"] === "string" &&
      typeof (event as any)["To"] === "string" &&
      ((event as any)["SmsStatus"] === "received" || typeof (event as any)["Body"] === "string")
    );
  },
  getTriggerRegistrations: async (
    db: Database,
    triggerId: string,
    event: Record<string, any>,
  ) => {
    const to = (event as any).To as string | undefined;
    const registrations = await db
      .select()
      .from(triggerRegistrations)
      .where(eq(triggerRegistrations.triggerId, triggerId));
    return registrations
      .filter((r) => {
        const wantTo = (r.params as any)?.to as string | undefined;
        return !wantTo || wantTo === to;
      })
      .map((r) => ({
        ...r,
        expiresAt: r.expiresAt?.toISOString(),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
  },
  createEvents: async (
    event: Record<string, any>,
    headers: Record<string, any>,
    registration: TriggerRegistration,
  ) => {
    void headers;
    const details: SmsIncomingEvent = {
      messageSid: event.MessageSid,
      from: event.From,
      to: event.To,
      body: event.Body,
      raw: event,
    };
    return [
      {
        event: {
          type: EventType.RunIntent,
          timestamp: new Date().toISOString(),
          orgId: registration.orgId,
          agentId: registration.agentId,
          executionId: `exec-internal.sms.in-${Date.now()}`,
          userId: registration.connection?.userId!,
          details,
        },
        partitionKey: registration.id!,
      },
    ];
  },
};


