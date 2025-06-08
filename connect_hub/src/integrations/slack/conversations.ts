import { Type, Static } from "@sinclair/typebox";
import { ExecutionContext, Capability, CapabilityMeta, CapabilityRisk } from "../../providers/types.js";
import { createSlackClient } from "./chat.js";

// ---------------------------------------------------------------------------
// conversations.list capability
// ---------------------------------------------------------------------------

export const conversationsListParamsSchema = Type.Object({
  exclude_archived: Type.Optional(Type.Boolean()),
  types: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 1000 })),
  cursor: Type.Optional(Type.String()),
});

export const conversationsListResultSchema = Type.Object({
  ok: Type.Boolean(),
  channels: Type.Array(Type.Any()),
  response_metadata: Type.Optional(Type.Object({
    next_cursor: Type.Optional(Type.String()),
  })),
});

export type SlackConversationsListParams = Static<typeof conversationsListParamsSchema>;
export type SlackConversationsListResult = Static<typeof conversationsListResultSchema>;

export async function slackConversationsList(
  params: SlackConversationsListParams,
  ctx: ExecutionContext,
): Promise<SlackConversationsListResult> {
  const client = createSlackClient(ctx);

  try {
    const response = await client.conversations.list({
      exclude_archived: params.exclude_archived,
      types: params.types,
      limit: params.limit,
      cursor: params.cursor,
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.error}`);
    }

    return {
      ok: response.ok,
      channels: response.channels || [],
      response_metadata: response.response_metadata,
    };
  } catch (error: any) {
    if (error.code === 'slack_webapi_rate_limited') {
      const retryAfter = error.retryAfter || 60;
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Slack conversations.list error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// conversations.create capability
// ---------------------------------------------------------------------------

export const conversationCreateParamsSchema = Type.Object({
  name: Type.String(),
  is_private: Type.Optional(Type.Boolean()),
});

export const conversationCreateResultSchema = Type.Object({
  ok: Type.Boolean(),
  channel: Type.Optional(Type.Any()),
});

export type SlackConversationCreateParams = Static<typeof conversationCreateParamsSchema>;
export type SlackConversationCreateResult = Static<typeof conversationCreateResultSchema>;

export async function slackConversationCreate(
  params: SlackConversationCreateParams,
  ctx: ExecutionContext,
): Promise<SlackConversationCreateResult> {
  const client = createSlackClient(ctx);

  try {
    const response = await client.conversations.create({
      name: params.name,
      is_private: params.is_private,
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.error}`);
    }

    return {
      ok: response.ok,
      channel: response.channel,
    };
  } catch (error: any) {
    if (error.code === 'slack_webapi_rate_limited') {
      const retryAfter = error.retryAfter || 60;
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Slack conversation.create error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// conversations.history capability
// ---------------------------------------------------------------------------

export const conversationsHistoryParamsSchema = Type.Object({
  channel: Type.String(),
  cursor: Type.Optional(Type.String()),
  latest: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 1000 })),
  oldest: Type.Optional(Type.String()),
  inclusive: Type.Optional(Type.Boolean()),
});

export const conversationsHistoryResultSchema = Type.Object({
  ok: Type.Boolean(),
  messages: Type.Array(Type.Any()),
  has_more: Type.Optional(Type.Boolean()),
  response_metadata: Type.Optional(Type.Object({
    next_cursor: Type.Optional(Type.String()),
  })),
});

export type SlackConversationsHistoryParams = Static<typeof conversationsHistoryParamsSchema>;
export type SlackConversationsHistoryResult = Static<typeof conversationsHistoryResultSchema>;

export async function slackConversationsHistory(
  params: SlackConversationsHistoryParams,
  ctx: ExecutionContext,
): Promise<SlackConversationsHistoryResult> {
  const client = createSlackClient(ctx);

  try {
    const response = await client.conversations.history({
      channel: params.channel,
      cursor: params.cursor,
      latest: params.latest,
      limit: params.limit,
      oldest: params.oldest,
      inclusive: params.inclusive,
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.error}`);
    }

    return {
      ok: response.ok,
      messages: response.messages || [],
      has_more: response.has_more,
      response_metadata: response.response_metadata,
    };
  } catch (error: any) {
    if (error.code === 'slack_webapi_rate_limited') {
      const retryAfter = error.retryAfter || 60;
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Slack conversations.history error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// conversations.members capability
// ---------------------------------------------------------------------------

export const conversationsMembersParamsSchema = Type.Object({
  channel: Type.String(),
  cursor: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 1000 })),
});

export const conversationsMembersResultSchema = Type.Object({
  ok: Type.Boolean(),
  members: Type.Array(Type.String()),
  response_metadata: Type.Optional(Type.Object({
    next_cursor: Type.Optional(Type.String()),
  })),
});

export type SlackConversationsMembersParams = Static<typeof conversationsMembersParamsSchema>;
export type SlackConversationsMembersResult = Static<typeof conversationsMembersResultSchema>;

export async function slackConversationsMembers(
  params: SlackConversationsMembersParams,
  ctx: ExecutionContext,
): Promise<SlackConversationsMembersResult> {
  const client = createSlackClient(ctx);

  try {
    const response = await client.conversations.members({
      channel: params.channel,
      cursor: params.cursor,
      limit: params.limit,
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.error}`);
    }

    return {
      ok: response.ok,
      members: response.members || [],
      response_metadata: response.response_metadata,
    };
  } catch (error: any) {
    if (error.code === 'slack_webapi_rate_limited') {
      const retryAfter = error.retryAfter || 60;
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Slack conversations.members error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// conversations.join capability
// ---------------------------------------------------------------------------

export const conversationsJoinParamsSchema = Type.Object({
  channel: Type.String(),
});

export const conversationsJoinResultSchema = Type.Object({
  ok: Type.Boolean(),
  channel: Type.Optional(Type.Any()),
  warning: Type.Optional(Type.String()),
  response_metadata: Type.Optional(Type.Object({
    warnings: Type.Optional(Type.Array(Type.String())),
  })),
});

export type SlackConversationsJoinParams = Static<typeof conversationsJoinParamsSchema>;
export type SlackConversationsJoinResult = Static<typeof conversationsJoinResultSchema>;

export async function slackConversationsJoin(
  params: SlackConversationsJoinParams,
  ctx: ExecutionContext,
): Promise<SlackConversationsJoinResult> {
  const client = createSlackClient(ctx);

  try {
    const response = await client.conversations.join({
      channel: params.channel,
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.error}`);
    }

    return {
      ok: response.ok,
      channel: response.channel,
      warning: response.warning,
      response_metadata: response.response_metadata,
    };
  } catch (error: any) {
    if (error.code === 'slack_webapi_rate_limited') {
      const retryAfter = error.retryAfter || 60;
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Slack conversations.join error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// conversations.invite capability
// ---------------------------------------------------------------------------

export const conversationsInviteParamsSchema = Type.Object({
  channel: Type.String(),
  users: Type.String(), // Comma-separated list of user IDs
});

export const conversationsInviteResultSchema = Type.Object({
  ok: Type.Boolean(),
  channel: Type.Optional(Type.Any()),
});

export type SlackConversationsInviteParams = Static<typeof conversationsInviteParamsSchema>;
export type SlackConversationsInviteResult = Static<typeof conversationsInviteResultSchema>;

export async function slackConversationsInvite(
  params: SlackConversationsInviteParams,
  ctx: ExecutionContext,
): Promise<SlackConversationsInviteResult> {
  const client = createSlackClient(ctx);

  try {
    const response = await client.conversations.invite({
      channel: params.channel,
      users: params.users,
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.error}`);
    }

    return {
      ok: response.ok,
      channel: response.channel,
    };
  } catch (error: any) {
    if (error.code === 'slack_webapi_rate_limited') {
      const retryAfter = error.retryAfter || 60;
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Slack conversations.invite error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Capability Factory Functions
// ---------------------------------------------------------------------------

export function createConversationsListCapability(): Capability<SlackConversationsListParams, SlackConversationsListResult> {
  const meta: CapabilityMeta = {
    id: "conversations.list",
    displayName: "List Conversations",
    description: "List all channels in a Slack workspace",
    docsUrl: "https://api.slack.com/methods/conversations.list",
    paramsSchema: conversationsListParamsSchema,
    resultSchema: conversationsListResultSchema,
    requiredScopes: ["channels:read", "groups:read"],
    risk: CapabilityRisk.LOW,
  };

  return {
    meta,
    execute: slackConversationsList,
  };
}

export function createConversationCreateCapability(): Capability<SlackConversationCreateParams, SlackConversationCreateResult> {
  const meta: CapabilityMeta = {
    id: "conversation.create",
    displayName: "Create Conversation",
    description: "Create a channel or private group",
    docsUrl: "https://api.slack.com/methods/conversations.create",
    paramsSchema: conversationCreateParamsSchema,
    resultSchema: conversationCreateResultSchema,
    requiredScopes: ["channels:manage"],
    risk: CapabilityRisk.MEDIUM,
  };
  
  return {
    meta,
    execute: slackConversationCreate,
  };
}

export function createConversationsHistoryCapability(): Capability<SlackConversationsHistoryParams, SlackConversationsHistoryResult> {
  const meta: CapabilityMeta = {
    id: "conversations.history",
    displayName: "Get Conversation History",
    description: "Fetch a conversation's history of messages and events",
    docsUrl: "https://api.slack.com/methods/conversations.history",
    paramsSchema: conversationsHistoryParamsSchema,
    resultSchema: conversationsHistoryResultSchema,
    requiredScopes: ["channels:history", "groups:history"],
    risk: CapabilityRisk.LOW,
  };

  return {
    meta,
    execute: slackConversationsHistory,
  };
}

export function createConversationsMembersCapability(): Capability<SlackConversationsMembersParams, SlackConversationsMembersResult> {
  const meta: CapabilityMeta = {
    id: "conversations.members",
    displayName: "Get Conversation Members",
    description: "Retrieve members of a conversation",
    docsUrl: "https://api.slack.com/methods/conversations.members",
    paramsSchema: conversationsMembersParamsSchema,
    resultSchema: conversationsMembersResultSchema,
    requiredScopes: ["channels:read", "groups:read"],
    risk: CapabilityRisk.LOW,
  };

  return {
    meta,
    execute: slackConversationsMembers,
  };
}

export function createConversationsJoinCapability(): Capability<SlackConversationsJoinParams, SlackConversationsJoinResult> {
  const meta: CapabilityMeta = {
    id: "conversations.join",
    displayName: "Join Conversation",
    description: "Join an existing conversation",
    docsUrl: "https://api.slack.com/methods/conversations.join",
    paramsSchema: conversationsJoinParamsSchema,
    resultSchema: conversationsJoinResultSchema,
    requiredScopes: ["channels:join"],
    risk: CapabilityRisk.MEDIUM,
  };

  return {
    meta,
    execute: slackConversationsJoin,
  };
}

export function createConversationsInviteCapability(): Capability<SlackConversationsInviteParams, SlackConversationsInviteResult> {
  const meta: CapabilityMeta = {
    id: "conversations.invite",
    displayName: "Invite to Conversation",
    description: "Invite users to a channel",
    docsUrl: "https://api.slack.com/methods/conversations.invite",
    paramsSchema: conversationsInviteParamsSchema,
    resultSchema: conversationsInviteResultSchema,
    requiredScopes: ["channels:manage"],
    risk: CapabilityRisk.MEDIUM,
  };

  return {
    meta,
    execute: slackConversationsInvite,
  };
} 