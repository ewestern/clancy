import { Type, Static } from "@sinclair/typebox";
import { ExecutionContext, Capability, CapabilityMeta, CapabilityRisk } from "../../providers/types.js";
import { WebClient } from "@slack/web-api";

// ---------------------------------------------------------------------------
// Helper Function to Create WebClient
// ---------------------------------------------------------------------------

export function createSlackClient(ctx: ExecutionContext): WebClient {
  const accessToken = ctx.tokenPayload?.access_token;
  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error("Slack access token is missing from execution context");
  }

  return new WebClient(accessToken);
}

// ---------------------------------------------------------------------------
// chat.post capability
// ---------------------------------------------------------------------------

export const chatPostParamsSchema = Type.Object({
  channel: Type.String(),
  text: Type.String(),
  blocks: Type.Optional(Type.Array(Type.Any())),
  thread_ts: Type.Optional(Type.String()),
});

export const chatPostResultSchema = Type.Object({
  ok: Type.Boolean(),
  channel: Type.String(),
  ts: Type.String(),
  message: Type.Optional(Type.Any()),
});

export type SlackChatPostParams = Static<typeof chatPostParamsSchema>;
export type SlackChatPostResult = Static<typeof chatPostResultSchema>;

export async function slackChatPost(
  params: SlackChatPostParams,
  ctx: ExecutionContext,
): Promise<SlackChatPostResult> {
  const client = createSlackClient(ctx);

  try {
    const response = await client.chat.postMessage({
      channel: params.channel,
      text: params.text,
      blocks: params.blocks,
      thread_ts: params.thread_ts,
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.error}`);
    }

    return {
      ok: response.ok,
      channel: response.channel!,
      ts: response.ts!,
      message: response.message,
    };
  } catch (error: any) {
    if (error.code === 'slack_webapi_rate_limited') {
      const retryAfter = error.retryAfter || 60;
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Slack chat.post error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// chat.update capability
// ---------------------------------------------------------------------------

export const chatUpdateParamsSchema = Type.Object({
  channel: Type.String(),
  ts: Type.String(),
  text: Type.Optional(Type.String()),
  blocks: Type.Optional(Type.Array(Type.Any())),
  attachments: Type.Optional(Type.Array(Type.Any())),
  parse: Type.Optional(Type.Union([Type.Literal("full"), Type.Literal("none")])),
  link_names: Type.Optional(Type.Boolean()),
  file_ids: Type.Optional(Type.Array(Type.String())),
});

export const chatUpdateResultSchema = Type.Object({
  ok: Type.Boolean(),
  channel: Type.Optional(Type.String()),
  ts: Type.Optional(Type.String()),
  text: Type.Optional(Type.String()),
  message: Type.Optional(Type.Any()),
});

export type SlackChatUpdateParams = Static<typeof chatUpdateParamsSchema>;
export type SlackChatUpdateResult = Static<typeof chatUpdateResultSchema>;

export async function slackChatUpdate(
  params: SlackChatUpdateParams,
  ctx: ExecutionContext,
): Promise<SlackChatUpdateResult> {
  const client = createSlackClient(ctx);

  try {
    const updateArgs: any = {
      channel: params.channel,
      ts: params.ts,
    };

    if (params.text) updateArgs.text = params.text;
    if (params.blocks) updateArgs.blocks = params.blocks;
    if (params.attachments) updateArgs.attachments = params.attachments;
    if (params.parse) updateArgs.parse = params.parse;
    if (params.link_names !== undefined) updateArgs.link_names = params.link_names;
    if (params.file_ids) updateArgs.file_ids = params.file_ids;

    const response = await client.chat.update(updateArgs);

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.error}`);
    }

    return {
      ok: response.ok,
      channel: response.channel,
      ts: response.ts,
      text: response.text,
      message: response.message,
    };
  } catch (error: any) {
    if (error.code === 'slack_webapi_rate_limited') {
      const retryAfter = error.retryAfter || 60;
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Slack chat.update error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// chat.scheduleMessage capability
// ---------------------------------------------------------------------------

export const chatScheduleMessageParamsSchema = Type.Object({
  channel: Type.String(),
  post_at: Type.Number(), // Unix timestamp
  text: Type.Optional(Type.String()),
  blocks: Type.Optional(Type.Array(Type.Any())),
  attachments: Type.Optional(Type.Array(Type.Any())),
  parse: Type.Optional(Type.Union([Type.Literal("full"), Type.Literal("none")])),
  link_names: Type.Optional(Type.Boolean()),
  unfurl_links: Type.Optional(Type.Boolean()),
  unfurl_media: Type.Optional(Type.Boolean()),
  thread_ts: Type.Optional(Type.String()),
});

export const chatScheduleMessageResultSchema = Type.Object({
  ok: Type.Boolean(),
  channel: Type.Optional(Type.String()),
  scheduled_message_id: Type.Optional(Type.String()),
  post_at: Type.Optional(Type.Number()),
  message: Type.Optional(Type.Any()),
});

export type SlackChatScheduleMessageParams = Static<typeof chatScheduleMessageParamsSchema>;
export type SlackChatScheduleMessageResult = Static<typeof chatScheduleMessageResultSchema>;

export async function slackChatScheduleMessage(
  params: SlackChatScheduleMessageParams,
  ctx: ExecutionContext,
): Promise<SlackChatScheduleMessageResult> {
  const client = createSlackClient(ctx);

  try {
    const scheduleArgs: any = {
      channel: params.channel,
      post_at: params.post_at,
    };

    if (params.text) scheduleArgs.text = params.text;
    if (params.blocks) scheduleArgs.blocks = params.blocks;
    if (params.attachments) scheduleArgs.attachments = params.attachments;
    if (params.parse) scheduleArgs.parse = params.parse;
    if (params.link_names !== undefined) scheduleArgs.link_names = params.link_names;
    if (params.unfurl_links !== undefined) scheduleArgs.unfurl_links = params.unfurl_links;
    if (params.unfurl_media !== undefined) scheduleArgs.unfurl_media = params.unfurl_media;
    if (params.thread_ts) scheduleArgs.thread_ts = params.thread_ts;

    const response = await client.chat.scheduleMessage(scheduleArgs);

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.error}`);
    }

    return {
      ok: response.ok,
      channel: response.channel,
      scheduled_message_id: response.scheduled_message_id,
      post_at: response.post_at,
      message: response.message,
    };
  } catch (error: any) {
    if (error.code === 'slack_webapi_rate_limited') {
      const retryAfter = error.retryAfter || 60;
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Slack chat.scheduleMessage error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Capability Factory Functions
// ---------------------------------------------------------------------------

export function createChatPostCapability(): Capability<SlackChatPostParams, SlackChatPostResult> {
  const meta: CapabilityMeta = {
    id: "chat.post",
    displayName: "Post Message",
    description: "Send a message to a Slack channel using chat.postMessage",
    docsUrl: "https://api.slack.com/methods/chat.postMessage",
    paramsSchema: chatPostParamsSchema,
    resultSchema: chatPostResultSchema,
    requiredScopes: ["chat:write"],
    risk: CapabilityRisk.HIGH,
  };

  return {
    meta,
    execute: slackChatPost,
  };
}

export function createChatUpdateCapability(): Capability<SlackChatUpdateParams, SlackChatUpdateResult> {
  const meta: CapabilityMeta = {
    id: "chat.update",
    displayName: "Update Message",
    description: "Update a message in a channel",
    docsUrl: "https://api.slack.com/methods/chat.update",
    paramsSchema: chatUpdateParamsSchema,
    resultSchema: chatUpdateResultSchema,
    requiredScopes: ["chat:write"],
    risk: CapabilityRisk.MEDIUM,
  };

  return {
    meta,
    execute: slackChatUpdate,
  };
}

export function createChatScheduleMessageCapability(): Capability<SlackChatScheduleMessageParams, SlackChatScheduleMessageResult> {
  const meta: CapabilityMeta = {
    id: "chat.scheduleMessage",
    displayName: "Schedule Message",
    description: "Schedule a message to be sent at a later time",
    docsUrl: "https://api.slack.com/methods/chat.scheduleMessage",
    paramsSchema: chatScheduleMessageParamsSchema,
    resultSchema: chatScheduleMessageResultSchema,
    requiredScopes: ["chat:write"],
    risk: CapabilityRisk.HIGH,
  };

  return {
    meta,
    execute: slackChatScheduleMessage,
  };
} 