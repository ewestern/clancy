import { Static, Type } from "@sinclair/typebox";
import {
  CapabilityMeta,
  CapabilityRisk,
  ExecutionContext,
} from "../../providers/types.js";
import { OwnershipScope } from "../../models/shared.js";
import { tavily } from "@tavily/core";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const webSearchParamsSchema = Type.Object({
  query: Type.String({ description: "Web search query" }),
  maxResults: Type.Optional(
    Type.Integer({ minimum: 1, maximum: 20, default: 5 }),
  ),
  includeAnswer: Type.Optional(
    Type.Boolean({ description: "Return model-generated concise answer", default: true }),
  ),
});
export type WebSearchParams = Static<typeof webSearchParamsSchema>;

export const webSearchSourceSchema = Type.Object({
  title: Type.Optional(Type.String()),
  url: Type.String(),
  content: Type.Optional(Type.String()),
  score: Type.Optional(Type.Number()),
});

export const webSearchResultSchema = Type.Object({
  answer: Type.Optional(Type.String({ description: "Concise synthesized answer" })),
  sources: Type.Array(webSearchSourceSchema),
});
export type WebSearchResult = Static<typeof webSearchResultSchema>;

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function executeWebSearch(
  params: WebSearchParams,
  _ctx: ExecutionContext,
): Promise<WebSearchResult> {
  const { query, maxResults = 5, includeAnswer = true } = params;

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const client = tavily({ apiKey });

  // The JS SDK returns an object including "answer" and "results" (sources)
  const options: { includeAnswer?: boolean; maxResults?: number } = {
    includeAnswer,
    maxResults,
  };
  const response = await client.search(query, options);

  let answer: string | undefined;
  let sources: WebSearchResult["sources"] = [];

  if (isRecord(response)) {
    const maybeAnswer = response["answer"];
    if (typeof maybeAnswer === "string") {
      answer = maybeAnswer;
    }

    const maybeResults = response["results"];
    if (Array.isArray(maybeResults)) {
      const built: WebSearchResult["sources"] = [];
      for (const item of maybeResults) {
        if (!isRecord(item)) continue;
        const urlVal = item["url"];
        if (typeof urlVal !== "string") continue;
        const titleVal = item["title"];
        const contentVal = item["content"];
        const scoreVal = item["score"];
        built.push({
          url: urlVal,
          title: typeof titleVal === "string" ? titleVal : undefined,
          content: typeof contentVal === "string" ? contentVal : undefined,
          score: typeof scoreVal === "number" ? scoreVal : undefined,
        });
      }
      sources = built;
    }
  }

  return { answer, sources };
}

// ---------------------------------------------------------------------------
// Capability Factory
// ---------------------------------------------------------------------------

export function getWebSearchCapability() {
  const meta: CapabilityMeta = {
    id: "web.search",
    displayName: "Web Search",
    description: "Search the public web and return synthesized answer with sources.",
    paramsSchema: webSearchParamsSchema,
    resultSchema: webSearchResultSchema,
    requiredScopes: [],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };

  return {
    meta,
    execute: async (params: WebSearchParams, ctx: ExecutionContext) => {
      return await executeWebSearch(params, ctx);
    },
  };
}


