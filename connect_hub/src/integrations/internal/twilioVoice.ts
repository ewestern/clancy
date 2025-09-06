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
import { Database } from "../../plugins/database.js";
import { triggerRegistrations } from "../../database/schema.js";
import { eq } from "drizzle-orm";
import { TriggerRegistration } from "../../models/triggers.js";
import { EventType } from "@ewestern/events";
import { CallListInstanceCreateOptions } from "twilio/lib/rest/api/v2010/account/call.js";

// -----------------------------------------------------------------------------
// Capability: voice.call.place
// -----------------------------------------------------------------------------

export const voiceCallPlaceParamsSchema = Type.Object({
  to: Type.String({ description: "E.164 destination number" }),
  from: Type.Optional(Type.String({ description: "Caller ID E.164" })),
  twiml: Type.Optional(Type.String({ description: "Inline TwiML string" })),
  answerUrl: Type.Optional(Type.String({ description: "Webhook URL serving TwiML" })),
  record: Type.Optional(Type.Boolean({ description: "Record the call" })),
});

export const voiceCallPlaceResultSchema = Type.Object({
  sid: Type.String(),
  status: Type.String(),
  to: Type.String(),
});

export type VoiceCallPlaceParams = Static<typeof voiceCallPlaceParamsSchema>;
export type VoiceCallPlaceResult = Static<typeof voiceCallPlaceResultSchema>;

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN env var");
  }
  return twilio(accountSid, authToken);
}

async function voiceCallPlaceExecute(
  params: VoiceCallPlaceParams,
  ctx: ExecutionContext,
): Promise<VoiceCallPlaceResult> {
  void ctx;
  const client = getTwilioClient();
  const from = params.from || process.env.TWILIO_VOICE_FROM;
  if (!from) {
    throw new Error("Provide from or set TWILIO_VOICE_FROM env var");
  }

  const createParams: CallListInstanceCreateOptions = {
    to: params.to,
    from,
    record: params.record ?? false,
  };
  //if (params.twiml) {
  //  createParams.twiml = params.twiml;
  //} else if (params.answerUrl) {
  //  createParams.url = params.answerUrl;
  //} else {
  //  // Default simple message
  //  createParams.twiml = `<Response><Say voice="polly.Joanna">This is a call from Clancy. No TwiML provided.</Say></Response>`;
  //}

  const call = await client.calls.create(createParams);
  return {
    sid: call.sid,
    status: call.status ?? "queued",
    to: call.to ?? params.to,
  };
}

export function getVoiceCallPlaceCapability(): Capability<
  VoiceCallPlaceParams,
  VoiceCallPlaceResult
> {
  const meta: CapabilityMeta = {
    id: "voice.call.place",
    displayName: "Place Voice Call",
    description: "Place an outbound call via Twilio using Clancy credentials.",
    docsUrl: "https://www.twilio.com/docs/voice/api/call-resource#create-a-call-resource",
    paramsSchema: voiceCallPlaceParamsSchema,
    resultSchema: voiceCallPlaceResultSchema,
    requiredScopes: [],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.HIGH,
  };
  return { meta, execute: voiceCallPlaceExecute };
}

// -----------------------------------------------------------------------------
// Trigger: voice.incomingCallReceived
// -----------------------------------------------------------------------------

export const voiceIncomingParamsSchema = Type.Object({
  to: Type.Optional(Type.String({ description: "Filter by dialed number" })),
});

export const voiceIncomingEventSchema = Type.Object({
  callSid: Type.String(),
  from: Type.String(),
  to: Type.String(),
  callStatus: Type.Optional(Type.String()),
  raw: Type.Optional(Type.Record(Type.String(), Type.Any())),
});

export type VoiceIncomingEvent = Static<typeof voiceIncomingEventSchema>;

export const voiceIncomingTrigger: Trigger<Record<string, any>> = {
  id: "voice.incomingCallReceived",
  displayName: "Incoming Voice Call Received",
  description: "Fires when a Twilio number receives a voice call.",
  paramsSchema: voiceIncomingParamsSchema,
  eventDetailsSchema: voiceIncomingEventSchema,
  renderTriggerDefinition: (trigger, registration) => {
    if (registration.params.to) return `Incoming call to ${registration.params.to}`;
    return "Incoming call on any configured number";
  },
  eventSatisfies: (event) => {
    // Twilio voice webhook includes CallSid, From, To
    return true;
  },
  getTriggerRegistrations: async (
    db: Database,
    triggerId: string,
    event: Record<string, any>,
  ) => {
    const to = event.To as string;
    const registrations = await db
      .select()
      .from(triggerRegistrations)
      .where(eq(triggerRegistrations.triggerId, triggerId));
    return registrations
      .filter((r) => {
        const wantTo = r.params?.to as string | undefined;
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
    const details: VoiceIncomingEvent = {
      callSid: event.CallSid,
      from: event.From,
      to: event.To,
      callStatus: event.CallStatus,
      raw: event,
    };
    return [
      {
        event: {
          type: EventType.RunIntent,
          timestamp: new Date().toISOString(),
          orgId: registration.orgId,
          agentId: registration.agentId,
          executionId: `exec-internal.voice.in-${Date.now()}`,
          userId: registration.connection?.userId!,
          details,
        },
        partitionKey: registration.id!,
      },
    ];
  },
};


