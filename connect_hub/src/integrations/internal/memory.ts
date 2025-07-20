import { Static, Type } from "@sinclair/typebox";
import {
  CapabilityMeta,
  CapabilityRisk,
  ExecutionContext,
} from "../../providers/types.js";
import { OwnershipScope } from "../../models/shared.js";
import { agentMemory } from "../../database/schema.js";
import { eq, and } from "drizzle-orm";

// Memory Store
export const memoryStoreParamsSchema = Type.Object({
  agentId: Type.String({
    description: "Agent identifier that owns this memory",
  }),
  memoryKey: Type.String({
    description:
      "Memory key (e.g., 'processed_emails', 'user_preferences', 'current_state')",
  }),
  data: Type.Unknown({
    description: "Data to store (JSON serializable)",
  }),
  ttl: Type.Optional(
    Type.Number({
      description: "Time to live in seconds (optional)",
    }),
  ),
});
export type MemoryStoreParams = Static<typeof memoryStoreParamsSchema>;

// Memory Retrieve
export const memoryRetrieveParamsSchema = Type.Object({
  agentId: Type.String({ description: "Agent identifier" }),
  memoryKey: Type.Optional(
    Type.String({
      description:
        "Specific memory key (if omitted, returns all keys for agent)",
    }),
  ),
});
export type MemoryRetrieveParams = Static<typeof memoryRetrieveParamsSchema>;

export const memoryRetrieveResultSchema = Type.Object({
  data: Type.Optional(Type.Unknown({ description: "Retrieved data" })),
  found: Type.Boolean({ description: "Whether the memory key was found" }),
  allKeys: Type.Optional(
    Type.Array(Type.String(), {
      description:
        "All memory keys for process (when no specific key requested)",
    }),
  ),
});
export type MemoryRetrieveResult = Static<typeof memoryRetrieveResultSchema>;

// Memory Update
export const memoryUpdateParamsSchema = Type.Object({
  agentId: Type.String({ description: "Agent identifier" }),
  memoryKey: Type.String({ description: "Memory key to update" }),
  data: Type.Unknown({ description: "New data to store" }),
  merge: Type.Optional(
    Type.Boolean({
      description: "Whether to merge with existing data (for objects)",
    }),
  ),
});
export type MemoryUpdateParams = Static<typeof memoryUpdateParamsSchema>;

// Memory Delete
export const memoryDeleteParamsSchema = Type.Object({
  agentId: Type.String({ description: "Agent identifier" }),
  memoryKey: Type.Optional(
    Type.String({
      description:
        "Specific memory key (if omitted, deletes all memory for agent)",
    }),
  ),
});
export type MemoryDeleteParams = Static<typeof memoryDeleteParamsSchema>;

async function executeMemoryStore(
  params: MemoryStoreParams,
  ctx: ExecutionContext,
) {
  const { agentId, memoryKey, data, ttl } = params;

  const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : null;

  // Upsert memory entry
  const existing = await ctx.db
    .select()
    .from(agentMemory)
    .where(
      and(
        eq(agentMemory.agentId, agentId),
        eq(agentMemory.memoryKey, memoryKey),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await ctx.db
      .update(agentMemory)
      .set({
        data,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(agentMemory.id, existing[0]!.id));
  } else {
    await ctx.db.insert(agentMemory).values({
      agentId,
      memoryKey,
      data,
      expiresAt,
    });
  }
}

async function executeMemoryRetrieve(
  params: MemoryRetrieveParams,
  ctx: ExecutionContext,
): Promise<MemoryRetrieveResult> {
  const { agentId, memoryKey } = params;

  if (memoryKey) {
    // Get specific key
    const [result] = await ctx.db
      .select()
      .from(agentMemory)
      .where(
        and(
          eq(agentMemory.agentId, agentId),
          eq(agentMemory.memoryKey, memoryKey),
        ),
      )
      .limit(1);

    return {
      data: result?.data,
      found: !!result,
    };
  } else {
    // Get all keys for agent
    const results = await ctx.db
      .select({ memoryKey: agentMemory.memoryKey })
      .from(agentMemory)
      .where(eq(agentMemory.agentId, agentId));

    return {
      found: results.length > 0,
      allKeys: results.map((r) => r.memoryKey),
    };
  }
}

async function executeMemoryUpdate(
  params: MemoryUpdateParams,
  ctx: ExecutionContext,
) {
  const { agentId, memoryKey, data, merge = false } = params;

  if (merge && typeof data === "object" && data !== null) {
    // Get existing data and merge
    const [existing] = await ctx.db
      .select()
      .from(agentMemory)
      .where(
        and(
          eq(agentMemory.agentId, agentId),
          eq(agentMemory.memoryKey, memoryKey),
        ),
      )
      .limit(1);

    if (
      existing &&
      typeof existing.data === "object" &&
      existing.data !== null
    ) {
      const mergedData = { ...existing.data, ...data };
      await ctx.db
        .update(agentMemory)
        .set({
          data: mergedData,
          updatedAt: new Date(),
        })
        .where(eq(agentMemory.id, existing.id));
      return;
    }
  }

  // Regular update (or merge with non-object data)
  await executeMemoryStore({ agentId, memoryKey, data }, ctx);
}

async function executeMemoryDelete(
  params: MemoryDeleteParams,
  ctx: ExecutionContext,
) {
  const { agentId, memoryKey } = params;

  if (memoryKey) {
    // Delete specific key
    await ctx.db
      .delete(agentMemory)
      .where(
        and(
          eq(agentMemory.agentId, agentId),
          eq(agentMemory.memoryKey, memoryKey),
        ),
      );
  } else {
    // Delete all memory for agent
    await ctx.db.delete(agentMemory).where(eq(agentMemory.agentId, agentId));
  }
}

// Capability Factories
export function getMemoryStoreCapability() {
  const meta: CapabilityMeta = {
    id: "memory.store",
    displayName: "Store Memory",
    description: "Store persistent state data scoped to a specific agent.",
    paramsSchema: memoryStoreParamsSchema,
    resultSchema: Type.Object({ ok: Type.Boolean() }),
    requiredScopes: [],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return {
    meta,
    execute: async (params: MemoryStoreParams, ctx: ExecutionContext) => {
      await executeMemoryStore(params, ctx);
      return { ok: true };
    },
  };
}

export function getMemoryRetrieveCapability() {
  const meta: CapabilityMeta = {
    id: "memory.retrieve",
    displayName: "Retrieve Memory",
    description: "Retrieve persistent state data for a specific agent.",
    paramsSchema: memoryRetrieveParamsSchema,
    resultSchema: memoryRetrieveResultSchema,
    requiredScopes: [],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return {
    meta,
    execute: async (params: MemoryRetrieveParams, ctx: ExecutionContext) => {
      return await executeMemoryRetrieve(params, ctx);
    },
  };
}

export function getMemoryUpdateCapability() {
  const meta: CapabilityMeta = {
    id: "memory.update",
    displayName: "Update Memory",
    description: "Update existing agent memory with optional object merging.",
    paramsSchema: memoryUpdateParamsSchema,
    resultSchema: Type.Object({ ok: Type.Boolean() }),
    requiredScopes: [],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return {
    meta,
    execute: async (params: MemoryUpdateParams, ctx: ExecutionContext) => {
      await executeMemoryUpdate(params, ctx);
      return { ok: true };
    },
  };
}

export function getMemoryDeleteCapability() {
  const meta: CapabilityMeta = {
    id: "memory.delete",
    displayName: "Delete Memory",
    description: "Delete specific memory keys or all memory for an agent.",
    paramsSchema: memoryDeleteParamsSchema,
    resultSchema: Type.Object({ ok: Type.Boolean() }),
    requiredScopes: [],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return {
    meta,
    execute: async (params: MemoryDeleteParams, ctx: ExecutionContext) => {
      await executeMemoryDelete(params, ctx);
      return { ok: true };
    },
  };
}
