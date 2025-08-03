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
// files.upload capability
// ---------------------------------------------------------------------------

export const filesUploadParamsSchema = Type.Object({
  channels: Type.String(),
  content: Type.String(),
  filename: Type.String(),
});

export const filesUploadResultSchema = Type.Object({
  ok: Type.Boolean(),
  file: Type.Optional(Type.Any()),
});

export type SlackFilesUploadParams = Static<typeof filesUploadParamsSchema>;
export type SlackFilesUploadResult = Static<typeof filesUploadResultSchema>;

export async function slackFilesUpload(
  params: SlackFilesUploadParams,
  ctx: ExecutionContext,
): Promise<SlackFilesUploadResult> {
  const client = createSlackClient(ctx);

  try {
    const response = await client.files.upload({
      channels: params.channels,
      content: params.content,
      filename: params.filename,
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.error}`);
    }

    return {
      ok: response.ok,
      file: response.file,
    };
  } catch (error: any) {
    if (error.code === "slack_webapi_rate_limited") {
      const retryAfter = error.retryAfter || 60;
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Slack files.upload error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Capability Factory Functions
// ---------------------------------------------------------------------------

export function createFilesUploadCapability(): Capability<
  SlackFilesUploadParams,
  SlackFilesUploadResult
> {
  const meta: CapabilityMeta = {
    id: "files.upload",
    displayName: "Upload File",
    description: "Upload a file to Slack and share in channels",
    docsUrl: "https://api.slack.com/methods/files.upload",
    paramsSchema: filesUploadParamsSchema,
    resultSchema: filesUploadResultSchema,
    requiredScopes: ["files:write"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.MEDIUM,
  };

  return {
    meta,
    execute: slackFilesUpload,
  };
}
