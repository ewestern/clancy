import {
  ProviderRuntime,
  Capability,
  ExecutionContext,
  EventContext,
  CapabilityMeta,
  JSONSchema,
} from "../providers/types.js";

// Node 18+ provides global fetch. If your runtime is < 18, uncomment the next
// line and add `node-fetch` as a dependency.
// import fetch from "node-fetch";

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface SlackChatPostParams {
  /** Channel ID or name (e.g., C1234567890 or #general) */
  channel: string;
  /** Plain-text message content or fallback text when sending blocks */
  text: string;
  /** Optional JSON block kit payload */
  blocks?: unknown;
  /** Optional thread timestamp to reply in thread */
  thread_ts?: string;
}

export interface SlackChatPostResult {
  ok: boolean;
  channel: string;
  ts: string;
  message?: unknown;
  [key: string]: unknown;
}

const paramsSchema: JSONSchema = {
  type: "object",
  required: ["channel", "text"],
  properties: {
    channel: { type: "string" },
    text: { type: "string" },
    blocks: { type: "array", items: { type: "object" } },
    thread_ts: { type: "string" },
  },
  additionalProperties: false,
};

const resultSchema: JSONSchema = {
  type: "object",
  required: ["ok", "channel", "ts"],
  properties: {
    ok: { type: "boolean" },
    channel: { type: "string" },
    ts: { type: "string" },
    message: { type: "object" },
  },
};

// ---------------------------------------------------------------------------
// Action implementation
// ---------------------------------------------------------------------------

async function slackChatPost(
  params: SlackChatPostParams,
  ctx: ExecutionContext
): Promise<SlackChatPostResult> {
  if (!ctx.accessToken) {
    throw new Error("Slack access token is missing from execution context");
  }

  const endpoint = "https://slack.com/api/chat.postMessage";

  const response = await globalThis.fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${ctx.accessToken}`,
    },
    body: JSON.stringify(params),
  });

  // Handle HTTP-level errors (e.g., 5xx, rate limits)
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After") ?? "0";
    throw new Error(
      `Slack rate-limited the request. Retry after ${retryAfter} seconds.`
    );
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Slack API HTTP error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as SlackChatPostResult;

  if (!data.ok) {
    // Slack-level error (e.g., invalid_auth, channel_not_found)
    const errCode = (data as Record<string, unknown>).error ?? "unknown_error";
    throw new Error(`Slack API error: ${errCode}`);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class SlackProvider implements ProviderRuntime {
  private capabilityCache = new Map<string, Capability<any, any>>();

  getCapability<P, R>(capabilityId: string): Capability<P, R> {
    if (!this.capabilityCache.has(capabilityId)) {
      switch (capabilityId) {
        case "chat.post": {
          const meta: CapabilityMeta = {
            id: capabilityId,
            displayName: "Post Message",
            description: "Send a message to a Slack channel using chat.postMessage",
            paramsSchema,
            resultSchema,
          };

          const capabilityImpl: Capability<SlackChatPostParams, SlackChatPostResult> = {
            meta,
            execute: slackChatPost,
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
    _ctx: EventContext
  ): Promise<void> {
    /* eslint-enable @typescript-eslint/no-unused-vars */
    // TODO: handle Slack Events API callbacks when webhook support is added.
    return;
  }
}