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
// reaction.add capability
// ---------------------------------------------------------------------------

export const reactionAddParamsSchema = Type.Object({
  name: Type.String(),
  channel: Type.String(),
  timestamp: Type.String(),
});

export const reactionAddResultSchema = Type.Object({
  ok: Type.Boolean(),
});

export type SlackReactionAddParams = Static<typeof reactionAddParamsSchema>;
export type SlackReactionAddResult = Static<typeof reactionAddResultSchema>;

export async function slackReactionAdd(
  params: SlackReactionAddParams,
  ctx: ExecutionContext,
): Promise<SlackReactionAddResult> {
  const client = createSlackClient(ctx);

  try {
    const response = await client.reactions.add({
      name: params.name,
      channel: params.channel,
      timestamp: params.timestamp,
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.error}`);
    }

    return {
      ok: response.ok,
    };
  } catch (error: any) {
    if (error.code === "slack_webapi_rate_limited") {
      const retryAfter = error.retryAfter || 60;
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Slack reaction.add error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Capability Factory Functions
// ---------------------------------------------------------------------------

export function createReactionAddCapability(): Capability<
  SlackReactionAddParams,
  SlackReactionAddResult
> {
  const meta: CapabilityMeta = {
    id: "reaction.add",
    displayName: "Add Reaction",
    description: "Add an emoji reaction to a message",
    docsUrl: "https://api.slack.com/methods/reactions.add",
    paramsSchema: reactionAddParamsSchema,
    resultSchema: reactionAddResultSchema,
    requiredScopes: ["reactions:write"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.MEDIUM,
  };

  return {
    meta,
    execute: slackReactionAdd,
  };
}
