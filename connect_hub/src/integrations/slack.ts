import {
  ProviderRuntime,
  Capability,
  ExecutionContext,
  EventContext,
  CapabilityMeta,
} from "../providers/types.js";

import { ProviderAuth, ProviderKind } from "../models/capabilities.js";
import { Type, Static } from "@sinclair/typebox";
import { loadPrompts } from "../providers/utils.js";
const __dirname = import.meta.dirname;

// Type definitions derived from schemas below

const paramsSchema = Type.Object({
  channel: Type.String(),
  text: Type.String(),
  blocks: Type.Optional(Type.Array(Type.Any())),
  thread_ts: Type.Optional(Type.String()),
});

const resultSchema = Type.Object({
  ok: Type.Boolean(),
  channel: Type.String(),
  ts: Type.String(),
  message: Type.Optional(Type.Any()),
});

// Type definitions
type SlackChatPostParams = Static<typeof paramsSchema>;
type SlackChatPostResult = Static<typeof resultSchema>;

async function slackChatPost(
  params: SlackChatPostParams,
  ctx: ExecutionContext,
): Promise<SlackChatPostResult> {
  if (!ctx.accessToken) {
    throw new Error("Slack access token is missing from execution context");
  }

  return slackFetch<SlackChatPostResult>(
    "https://slack.com/api/chat.postMessage",
    params,
    ctx,
  );
}

export class SlackProvider implements ProviderRuntime {
  private capabilityCache = new Map<string, Capability<any, any>>();

  public readonly metadata = {
    id: "slack",
    displayName: "Slack",
    description: "Slack is a team communication and collaboration platform.",
    icon: "https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png",
    docsUrl: "https://api.slack.com/",
    kind: ProviderKind.External,
    auth: ProviderAuth.OAuth2,
  };

  getCapability<P, R>(capabilityId: string): Capability<P, R> {
    if (!this.capabilityCache.has(capabilityId)) {
      switch (capabilityId) {
        case "chat.post": {
          const meta: CapabilityMeta = {
            id: capabilityId,
            displayName: "Post Message",
            description:
              "Send a message to a Slack channel using chat.postMessage",
            docsUrl: "https://api.slack.com/methods/chat.postMessage",
            paramsSchema,
            resultSchema,
            promptVersions: loadPrompts(__dirname, capabilityId),
            requiredScopes: ["chat:write"],
          };

          const capabilityImpl: Capability<
            SlackChatPostParams,
            SlackChatPostResult
          > = {
            meta,
            execute: slackChatPost,
          };
          this.capabilityCache.set(capabilityId, capabilityImpl);
          break;
        }
        case "files.upload": {
          const meta: CapabilityMeta = {
            id: capabilityId,
            displayName: "Upload File",
            description: "Upload a file to Slack and share in channels",
            docsUrl: "https://api.slack.com/methods/files.upload",
            paramsSchema: filesUploadParamsSchema,
            resultSchema: filesUploadResultSchema,
            promptVersions: loadPrompts(__dirname, capabilityId),
            requiredScopes: ["files:write"],
          };
          const capabilityImpl: Capability<SlackFilesUploadParams, SlackFilesUploadResult> = {
            meta,
            execute: slackFilesUpload,
          };
          this.capabilityCache.set(capabilityId, capabilityImpl);
          break;
        }
        case "conversation.create": {
          const meta: CapabilityMeta = {
            id: capabilityId,
            displayName: "Create Conversation",
            description: "Create a channel or private group",
            docsUrl: "https://api.slack.com/methods/conversations.create",
            paramsSchema: convCreateParamsSchema,
            resultSchema: convCreateResultSchema,
            promptVersions: loadPrompts(__dirname, capabilityId),
            requiredScopes: ["channels:manage"],
          };
          const capabilityImpl: Capability<SlackConversationCreateParams, SlackConversationCreateResult> = {
            meta,
            execute: slackConversationCreate,
          };
          this.capabilityCache.set(capabilityId, capabilityImpl);
          break;
        }
        case "reaction.add": {
          const meta: CapabilityMeta = {
            id: capabilityId,
            displayName: "Add Reaction",
            description: "Add an emoji reaction to a message",
            docsUrl: "https://api.slack.com/methods/reactions.add",
            paramsSchema: reactionAddParamsSchema,
            resultSchema: reactionAddResultSchema,
            promptVersions: loadPrompts(__dirname, capabilityId),
            requiredScopes: ["reactions:write"],
          };
          const capabilityImpl: Capability<SlackReactionAddParams, SlackReactionAddResult> = {
            meta,
            execute: slackReactionAdd,
          };
          this.capabilityCache.set(capabilityId, capabilityImpl);
          break;
        }
        default:
          throw new Error(`Slack capability ${capabilityId} not implemented`);
      }
    }

    return this.capabilityCache.get(capabilityId)! as Capability<P, R>;
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  async handleEvent(
    _eventName: string,
    _payload: unknown,
    _ctx: EventContext,
  ): Promise<void> {
    /* eslint-enable @typescript-eslint/no-unused-vars */
    // TODO: handle Slack Events API callbacks when webhook support is added.
    return;
  }

  listCapabilities(): CapabilityMeta[] {
    // Ensure at least one capability instantiated to provide metadata
    if (this.capabilityCache.size === 0) {
      // eager-build known capabilities
      this.getCapability("chat.post");
    }
    return Array.from(this.capabilityCache.values()).map((c) => c.meta);
  }
}

// -------------------- files.upload -----------------------------
// Type definitions moved to be derived from schemas below

const filesUploadParamsSchema = Type.Object({
  channels: Type.String(),
  content: Type.String(),
  filename: Type.String(),
});

const filesUploadResultSchema = Type.Object({
  ok: Type.Boolean(),
  file: Type.Optional(Type.Any()),
});

// Type definitions
type SlackFilesUploadParams = Static<typeof filesUploadParamsSchema>;
type SlackFilesUploadResult = Static<typeof filesUploadResultSchema>;

async function slackFilesUpload(
  params: SlackFilesUploadParams,
  ctx: ExecutionContext,
): Promise<SlackFilesUploadResult> {
  if (!ctx.accessToken) throw new Error("Slack access token missing");

  return slackFetch<SlackFilesUploadResult>(
    "https://slack.com/api/files.upload",
    params,
    ctx,
  );
}

// -------------------- conversations.create ---------------------
const convCreateParamsSchema = Type.Object({
  name: Type.String(),
  is_private: Type.Optional(Type.Boolean()),
});

const convCreateResultSchema = Type.Object({
  ok: Type.Boolean(),
  channel: Type.Optional(Type.Any()),
});

type SlackConversationCreateParams = Static<typeof convCreateParamsSchema>;
type SlackConversationCreateResult = Static<typeof convCreateResultSchema>;

async function slackConversationCreate(
  params: SlackConversationCreateParams,
  ctx: ExecutionContext,
): Promise<SlackConversationCreateResult> {
  if (!ctx.accessToken) throw new Error("Slack access token missing");

  return slackFetch<SlackConversationCreateResult>(
    "https://slack.com/api/conversations.create",
    params,
    ctx,
  );
}

// -------------------- reactions.add ----------------------------
const reactionAddParamsSchema = Type.Object({
  name: Type.String(),
  channel: Type.String(),
  timestamp: Type.String(),
});

const reactionAddResultSchema = Type.Object({
  ok: Type.Boolean(),
});

type SlackReactionAddParams = Static<typeof reactionAddParamsSchema>;
type SlackReactionAddResult = Static<typeof reactionAddResultSchema>;

async function slackReactionAdd(
  params: SlackReactionAddParams,
  ctx: ExecutionContext,
): Promise<SlackReactionAddResult> {
  if (!ctx.accessToken) throw new Error("Slack access token missing");

  return slackFetch<SlackReactionAddResult>(
    "https://slack.com/api/reactions.add",
    params,
    ctx,
  );
}

// Helper: Slack-specific API call wrapper
async function slackFetch<T>(endpoint: string, params: unknown, ctx: ExecutionContext): Promise<T> {
  if (!ctx.accessToken) throw new Error("Slack access token missing");

  const res = await globalThis.fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${ctx.accessToken}`,
    },
    body: JSON.stringify(params ?? {}),
  });

  if (res.status === 429) {
    const retry = res.headers.get("Retry-After") ?? "0";
    throw new Error(`Rate limited; retry after ${retry}s`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const data = (await res.json()) as T & { ok?: boolean; error?: string };
  if (typeof data === "object" && data && "ok" in data && data.ok === false) {
    throw new Error(`Slack API error: ${data.error}`);
  }
  return data;
}
