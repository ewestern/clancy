import {
  ProviderRuntime,
  Capability,
  EventContext,
  CapabilityMeta,
  CapabilityFactory,
  OAuthAuthUrlParams,
  OAuthCallbackParams,
  OAuthContext,
  CallbackResult,
  Webhook,
  Trigger,
} from "../providers/types.js";

import { ProviderAuth, ProviderKind } from "../models/capabilities.js";
import { WebClient } from "@slack/web-api";
import crypto from "crypto";
import { Database } from "../plugins/database.js";

// Import capability factories from service modules
import {
  createChatPostCapability,
  createChatUpdateCapability,
  createChatScheduleMessageCapability,
} from "./slack/chat.js";

import {
  createConversationsListCapability,
  createConversationCreateCapability,
  createConversationsHistoryCapability,
  createConversationsMembersCapability,
  createConversationsJoinCapability,
  createConversationsInviteCapability,
} from "./slack/conversations.js";

import {
  createUsersListCapability,
  createUsersInfoCapability,
  createUsersLookupByEmailCapability,
} from "./slack/users.js";

import {
  createFilesUploadCapability,
} from "./slack/files.js";

import {
  createReactionAddCapability,
} from "./slack/reactions.js";
import { Static, Type } from "@sinclair/typebox";
import { Nullable, UnionOneOf } from "../models/shared.js";
import { FastifyRequestTypeBox, FastifyReplyTypeBox } from "../types/fastify.js";
import { TriggerRegistration } from "../models/triggers.js";
import { connections, triggerRegistrations } from "../database/schema.js";
import { and, eq, sql } from "drizzle-orm";
const __dirname = import.meta.dirname;


const WebhookEventSchema = Type.Object({
  token: Type.String(),

  team_id: Type.String(),
  api_app_id: Type.String(),
  event: Type.Object({
    type: Type.String(),
  }),
  type: Type.Literal("event_callback"),
  authorizations: Type.Array(
    Type.Object({
      enterprise_id: Type.Optional(Type.String()),
      team_id: Type.Optional(Type.String()),
      user_id: Type.Optional(Type.String()),
    })
  ),
  event_context: Type.String(),
  event_id: Type.String(),
  event_time: Type.Number(),
});

const WebhookChallengeSchema = Type.Object({
  token: Type.String(),
  type: Type.Literal("url_verification"),
  challenge: Type.String(),
});

const WebhookEndpoint = {
  tags: ["webhooks"],
  description: "Slack Events API callback",
  body: UnionOneOf([WebhookEventSchema, WebhookChallengeSchema]),
}

export type WebhookEvent = Static<typeof WebhookEventSchema>;
export type WebhookChallenge = Static<typeof WebhookChallengeSchema>;



async function validateWebhook(request: FastifyRequestTypeBox<typeof WebhookEndpoint>) {
  const providerMetadata = await request.server.getProviderMetadata("slack");
  return verifySlackRequest(request.headers, request.rawBody as string, providerMetadata?.signingSecret);
  //if (!verified) {
  //  reply.status(401).send({
  //    status: "unauthorized",
  //  });
  //  return;
  //}
  //switch (request.body.type) {
  //  case "url_verification":
  //    reply.status(200).send({
  //      challenge: request.body.challenge,
  //    });
  //    break;
  //  default:
  //    reply.status(200).send({
  //      status: "ok",
  //    });
  //    break;
  //}
}
// need to support multiple triggrs per webhook
const triggers = [{
      id: "message.created",
      description: "A message was created",
      eventSatisfies: (event: WebhookEvent) => {
        return event.event.type == "message";
      },
      getTriggerRegistrations: async (db: Database, triggerId: string, event: WebhookEvent) => {
        const authorization = event.authorizations[0];
        const registrations = await db.select({
          triggerRegistration: triggerRegistrations,
          connection: connections,
        })
        .from(triggerRegistrations)
        .innerJoin(connections, eq(triggerRegistrations.connectionId, connections.id))
        .where(and(eq(triggerRegistrations.triggerId, triggerId), eq(connections.providerId, "slack"), eq(sql`${connections.externalAccountMetadata}->>'team'->>'id'`, authorization.team_id)));
        return registrations.map(
          (r) => ({
            id: r.triggerRegistration.id,
            agentId: r.triggerRegistration.agentId,
            connectionId: r.triggerRegistration.connectionId!,
            connection: {
              id: r.connection.id,
              orgId: r.connection.orgId,
              providerId: r.connection.providerId,
              externalAccountMetadata: r.connection.externalAccountMetadata,
              status: r.connection.status,
            },
            triggerId: r.triggerRegistration.triggerId,
            metadata: r.triggerRegistration.metadata,
            expiresAt: r.triggerRegistration.expiresAt.toISOString(),
            createdAt: r.triggerRegistration.createdAt.toISOString(),
            updatedAt: r.triggerRegistration.updatedAt?.toISOString(),
          })
        );
      },
      createEvents: async (event: WebhookEvent, triggerRegistration: TriggerRegistration) => {
        return [{
          event: event,
          partitionKey: triggerRegistration.id!,
        }];
      },
    }]

const webhooks = [
  {
    eventSchema: WebhookEndpoint,
    triggers: triggers,
    validateRequest: validateWebhook,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Verify that an incoming request genuinely comes from Slack.
 * Implements the signing procedure described here:
 * https://api.slack.com/authentication/verifying-requests-from-slack
 *
 * @param headers        The request headers object (keys will be lower-case).
 * @param rawBody        The raw (unparsed) request body as a string.
 * @param signingSecret  Your Slack app's signing secret.
 *
 * @returns `true` if the request signature matches and the timestamp is
 *          within five minutes of the current time, otherwise `false`.
 */
export function verifySlackRequest(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string,
  signingSecret: string,
): boolean {
  // Slack uses these two headers for signing verification.
  const slackSignatureHeader = headers["x-slack-signature"];
  const slackTimestampHeader = headers["x-slack-request-timestamp"];

  // Accept both single–string or string[] header shapes.
  const slackSignature = Array.isArray(slackSignatureHeader)
    ? slackSignatureHeader[0]
    : slackSignatureHeader;
  const timestamp = Array.isArray(slackTimestampHeader)
    ? slackTimestampHeader[0]
    : slackTimestampHeader;

  if (!slackSignature || !timestamp) {
    return false;
  }

  const tsNumber = parseInt(timestamp, 10);
  if (Number.isNaN(tsNumber)) {
    return false;
  }

  // Protect against replay attacks – reject if request is older than 5 minutes.
  const fiveMinutesInSeconds = 60 * 5;
  const currentTimeInSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTimeInSeconds - tsNumber) > fiveMinutesInSeconds) {
    return false;
  }

  // Compute the expected signature.
  const baseString = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto.createHmac("sha256", signingSecret);
  hmac.update(baseString);
  const expectedSignature = `v0=${hmac.digest("hex")}`;

  // Perform a constant-time comparison to avoid timing attacks.
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const providedBuffer = Buffer.from(slackSignature, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}


interface ExternalAccountMetadata {
  bot_user_id: string;
  app_id: string;
  team: {
    id: string;
    name: string;
  };
  enterprise: {
    id: string;
  } | null;
  authed_user: {
    id: string;
  };
}

export class SlackProvider implements ProviderRuntime<typeof WebhookEndpoint, WebhookEvent> {
  private readonly dispatchTable = new Map<string, Capability<any, any>>();
  public readonly scopeMapping: Record<string, string[]>;
  links = [
    "https://api.slack.com/apps/A095CEPRBGW/general"
  ]

  public readonly metadata = {
    id: "slack",
    displayName: "Slack",
    description: "Slack is a team communication and collaboration platform.",
    icon: "https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png",
    docsUrl: "https://api.slack.com/",
    kind: ProviderKind.External,
    auth: ProviderAuth.OAuth2,
  };

  constructor() {
    // Define capability factories
    const capabilityFactories: Record<string, CapabilityFactory> = {
      "chat.post": createChatPostCapability,
      "chat.update": createChatUpdateCapability,
      "chat.scheduleMessage": createChatScheduleMessageCapability,
      "files.upload": createFilesUploadCapability,
      "conversation.create": createConversationCreateCapability,
      "reaction.add": createReactionAddCapability,
      "conversations.list": createConversationsListCapability,
      "users.list": createUsersListCapability,
      "users.info": createUsersInfoCapability,
      "conversations.history": createConversationsHistoryCapability,
      "conversations.members": createConversationsMembersCapability,
      "conversations.join": createConversationsJoinCapability,
      "conversations.invite": createConversationsInviteCapability,
      "users.lookupByEmail": createUsersLookupByEmailCapability,
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
          this.scopeMapping[capabilityId] = [];
        }
        this.scopeMapping[capabilityId].push(scope);
      }
    }
  }

  getCapability<P, R>(capabilityId: string): Capability<P, R> {
    const capability = this.dispatchTable.get(capabilityId);
    if (!capability) {
      throw new Error(`Slack capability ${capabilityId} not implemented`);
    }
    return capability as Capability<P, R>;
  }

  webhooks = webhooks;

  listCapabilities(): CapabilityMeta[] {
    return Array.from(this.dispatchTable.values()).map((c) => c.meta);
  }

  // ---------------------------------------------------------------------------
  // OAuth Implementation
  // ---------------------------------------------------------------------------

  generateAuthUrl(params: OAuthAuthUrlParams, ctx: OAuthContext): string {
    // Build Slack OAuth 2.0 authorization URL
    const authUrl = new URL("https://slack.com/oauth/v2/authorize");
    authUrl.searchParams.append("client_id", ctx.clientId);
    authUrl.searchParams.append("scope", params.scopes.join(","));
    authUrl.searchParams.append("state", params.state);
    authUrl.searchParams.append("redirect_uri", ctx.redirectUri);
    return authUrl.toString();
  }

  async handleCallback(
    callbackParams: OAuthCallbackParams,
    ctx: OAuthContext,
  ): Promise<CallbackResult> {
    if (callbackParams.error) {
      throw new Error(`Slack OAuth error: ${callbackParams.error_description || callbackParams.error}`);
    }

    if (!callbackParams.code) {
      throw new Error("Authorization code not provided in callback");
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: callbackParams.code,
        redirect_uri: ctx.redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Slack token exchange failed: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.ok) {
      throw new Error(`Slack token exchange error: ${tokenData.error}`);
    }

    // Slack OAuth v2 returns different token types
    const tokens = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || "Bearer",
      scope: tokenData.scope,

    };
    const externalAccountMetadata = {
      bot_user_id: tokenData.bot_user_id,
      app_id: tokenData.app_id,
      team: tokenData.team,
      enterprise: tokenData.enterprise,
      authed_user: tokenData.authed_user,
    };

    // Extract scopes from the response
    const scopes = tokenData.scope ? tokenData.scope.split(" ") : [];

    return {
      tokenPayload: tokens,
      scopes,
      externalAccountMetadata,
    };
  }

  async refreshToken(
    tokenPayload: Record<string, unknown>,
    ctx: OAuthContext,
  ): Promise<Record<string, unknown>> {
    // Slack OAuth v2 typically uses long-lived tokens that don't expire
    // However, if refresh tokens are used, implement here
    throw new Error("Slack OAuth v2 tokens typically don't require refresh. Long-lived tokens are used.");
  }

  async isTokenValid(accessToken: string): Promise<boolean> {
    // Test the token by making a simple API call using the SDK
    try {
      if (!accessToken || typeof accessToken !== 'string') {
        return false;
      }
      const client = new WebClient(accessToken);
      const response = await client.auth.test();
      return response.ok === true;
    } catch (error) {
      return false;
    }
  }
}
