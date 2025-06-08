import { Static, Type } from "@sinclair/typebox";
import { CapabilityMeta, CapabilityRisk, ExecutionContext } from "../../providers/types.js";
import { knowledgeSnippets } from "../../database/schema.js";
import { cosineDistance, desc, eq, gte, sql, and } from "drizzle-orm";
import { Nullable } from "../../models/shared.js";
import { OpenAIEmbeddings } from "@langchain/openai";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import dotenv from "dotenv";
dotenv.config();

const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
  });

export const knowledgeSearchParamsSchema = Type.Object({
    query: Type.String({ description: "Natural language search query" }),
    threshold: Type.Optional(Type.Number({ description: "Similarity threshold (0-1)", default: 0.8 })),
    limit: Type.Optional(Type.Number({ description: "Number of results to return", default: 5 })),
});
export type KnowledgeSearchParams = Static<typeof knowledgeSearchParamsSchema>;

export const knowledgeSearchDocumentSchema = Type.Object({
    id: Type.String(),
    content: Nullable(Type.String({ description: "Snippet text" })),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    similarity: Type.Number({ description: "Cosine similarity score (0-1)" }),
});
export type KnowledgeSearchDocument = Static<typeof knowledgeSearchDocumentSchema>;

export const knowledgeSearchResultSchema = Type.Object({
    documents: Type.Array(knowledgeSearchDocumentSchema),
});
export type KnowledgeSearchResult = Static<typeof knowledgeSearchResultSchema>;

export const knowledgeWriteParamsSchema = Type.Object({
    content: Type.String({ description: "Plain-text content to store" }),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    sourceRunId: Type.Optional(Type.String({ description: "Originating run identifier" })),
});
export type KnowledgeWriteParams = Static<typeof knowledgeWriteParamsSchema>;

async function executeKnowledgeSearch(params: KnowledgeSearchParams, ctx: ExecutionContext): Promise<KnowledgeSearchDocument[]> {
    const { query, threshold = 0.8, limit = 5 } = params;

    // Create embedding for the search query
    const queryEmbedding = await embeddings.embedQuery(query);

    const similarity = sql<number>`1 - (${cosineDistance(knowledgeSnippets.embedding, queryEmbedding)})`;

    const results = await ctx.db
        .select({
            id: knowledgeSnippets.id,
            content: knowledgeSnippets.blob,
            similarity: similarity,
            metadata: knowledgeSnippets.metadata,
            //summary: sql<string | null>`(knowledge_snippets.metadata ->> 'summary')`,
            //s3ObjectUri: sql<string | null>`(knowledge_snippets.metadata ->> 's3ObjectUri')`,
        })
        .from(knowledgeSnippets)
        .where(and(gte(similarity, threshold), eq(knowledgeSnippets.orgId, ctx.orgId)))
        .orderBy(desc(similarity))
        .limit(limit);

    return results;
}

async function executeKnowledgeWrite(params: KnowledgeWriteParams, ctx: ExecutionContext) {
    const { content, metadata = {}, sourceRunId } = params;

    // Split large documents into ~1000-char chunks with 200 overlap
    const splitter = new CharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    const chunks = await splitter.splitText(content);

    // Embed all chunks in parallel
    const vectors = await embeddings.embedDocuments(chunks);

    const rows = chunks.map((chunk, idx) => ({
        orgId: ctx.orgId,
        sourceRunId,
        blob: chunk,
        embedding: vectors[idx],
        metadata,
    }));

    if (rows.length > 0) {
        await ctx.db.insert(knowledgeSnippets).values(rows);
    }
}

export function getKnowledgeSearchCapability() {
    const meta: CapabilityMeta = {
        id: "knowledge.search",
        displayName: "Search Knowledge",
        description: "Semantic search over the organization's knowledge snippets.",
        paramsSchema: knowledgeSearchParamsSchema,
        resultSchema: knowledgeSearchResultSchema,
        requiredScopes: [],
        risk: CapabilityRisk.LOW,
    };
    return {
        meta,
        execute: async (params: KnowledgeSearchParams, ctx: ExecutionContext) => {
            const results = await executeKnowledgeSearch(params, ctx);
            return {
                documents: results,
            };
        },
    };
}

export function getKnowledgeWriteCapability() {
    const meta: CapabilityMeta = {
        id: "knowledge.write",
        displayName: "Write Knowledge",
        description: "Store documents in vectorised knowledge snippets.",
        paramsSchema: knowledgeWriteParamsSchema,
        resultSchema: Type.Object({ ok: Type.Boolean() }),
        requiredScopes: [],
        risk: CapabilityRisk.LOW,
    };
    return {
        meta,
        execute: async (params: KnowledgeWriteParams, ctx: ExecutionContext) => {
            await executeKnowledgeWrite(params, ctx);
            return { ok: true };
        },
    };
}



