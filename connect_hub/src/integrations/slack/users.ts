import { Type, Static } from "@sinclair/typebox";
import {
  CapabilityMeta,
  CapabilityRisk,
  Capability,
  ExecutionContext,
} from "../../providers/types.js";
import { OwnershipScope } from "../../models/shared.js";
import { createSlackClient } from "./chat.js";

// ---------------------------------------------------------------------------
// users.list capability
// ---------------------------------------------------------------------------

export const usersListParamsSchema = Type.Object({
  cursor: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 1000 })),
  include_locale: Type.Optional(Type.Boolean()),
});

export const usersListResultSchema = Type.Object({
  ok: Type.Boolean(),
  members: Type.Array(Type.Any()),
  response_metadata: Type.Optional(
    Type.Object({
      next_cursor: Type.Optional(Type.String()),
    }),
  ),
});

export type SlackUsersListParams = Static<typeof usersListParamsSchema>;
export type SlackUsersListResult = Static<typeof usersListResultSchema>;

export async function slackUsersList(
  params: SlackUsersListParams,
  ctx: ExecutionContext,
): Promise<SlackUsersListResult> {
  const client = createSlackClient(ctx);

  try {
    const response = await client.users.list({
      cursor: params.cursor,
      limit: params.limit,
      include_locale: params.include_locale,
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
    if (error.code === "slack_webapi_rate_limited") {
      const retryAfter = error.retryAfter || 60;
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Slack users.list error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// users.info capability
// ---------------------------------------------------------------------------

export const usersInfoParamsSchema = Type.Object({
  user: Type.String(),
  include_locale: Type.Optional(Type.Boolean()),
});

export const usersInfoResultSchema = Type.Object({
  ok: Type.Boolean(),
  user: Type.Optional(Type.Any()),
});

export type SlackUsersInfoParams = Static<typeof usersInfoParamsSchema>;
export type SlackUsersInfoResult = Static<typeof usersInfoResultSchema>;

export async function slackUsersInfo(
  params: SlackUsersInfoParams,
  ctx: ExecutionContext,
): Promise<SlackUsersInfoResult> {
  const client = createSlackClient(ctx);

  try {
    const response = await client.users.info({
      user: params.user,
      include_locale: params.include_locale,
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.error}`);
    }

    return {
      ok: response.ok,
      user: response.user,
    };
  } catch (error: any) {
    if (error.code === "slack_webapi_rate_limited") {
      const retryAfter = error.retryAfter || 60;
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Slack users.info error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// users.lookupByEmail capability
// ---------------------------------------------------------------------------

export const usersLookupByEmailParamsSchema = Type.Object({
  email: Type.String({ format: "email" }),
});

export const usersLookupByEmailResultSchema = Type.Object({
  ok: Type.Boolean(),
  user: Type.Optional(Type.Any()),
});

export type SlackUsersLookupByEmailParams = Static<
  typeof usersLookupByEmailParamsSchema
>;
export type SlackUsersLookupByEmailResult = Static<
  typeof usersLookupByEmailResultSchema
>;

export async function slackUsersLookupByEmail(
  params: SlackUsersLookupByEmailParams,
  ctx: ExecutionContext,
): Promise<SlackUsersLookupByEmailResult> {
  const client = createSlackClient(ctx);

  try {
    const response = await client.users.lookupByEmail({
      email: params.email,
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.error}`);
    }

    return {
      ok: response.ok,
      user: response.user,
    };
  } catch (error: any) {
    if (error.code === "slack_webapi_rate_limited") {
      const retryAfter = error.retryAfter || 60;
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Slack users.lookupByEmail error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Capability Factory Functions
// ---------------------------------------------------------------------------

export function createUsersListCapability(): Capability<
  SlackUsersListParams,
  SlackUsersListResult
> {
  const meta: CapabilityMeta = {
    id: "users.list",
    displayName: "List Users",
    description: "List all users in a Slack workspace",
    docsUrl: "https://api.slack.com/methods/users.list",
    paramsSchema: usersListParamsSchema,
    resultSchema: usersListResultSchema,
    requiredScopes: ["users:read"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };

  return {
    meta,
    execute: slackUsersList,
  };
}

export function createUsersInfoCapability(): Capability<
  SlackUsersInfoParams,
  SlackUsersInfoResult
> {
  const meta: CapabilityMeta = {
    id: "users.info",
    displayName: "Get User Info",
    description: "Get information about a user",
    docsUrl: "https://api.slack.com/methods/users.info",
    paramsSchema: usersInfoParamsSchema,
    resultSchema: usersInfoResultSchema,
    requiredScopes: ["users:read"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };

  return {
    meta,
    execute: slackUsersInfo,
  };
}

export function createUsersLookupByEmailCapability(): Capability<
  SlackUsersLookupByEmailParams,
  SlackUsersLookupByEmailResult
> {
  const meta: CapabilityMeta = {
    id: "users.lookupByEmail",
    displayName: "Lookup User by Email",
    description: "Find a user with an email address",
    docsUrl: "https://api.slack.com/methods/users.lookupByEmail",
    paramsSchema: usersLookupByEmailParamsSchema,
    resultSchema: usersLookupByEmailResultSchema,
    requiredScopes: ["users:read.email"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };

  return {
    meta,
    execute: slackUsersLookupByEmail,
  };
}
