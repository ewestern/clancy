import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  text,
  unique,
  uniqueIndex,
  pgEnum,
  vector,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { ConnectionStatus } from "../models/connection.js";
import { OauthStatus } from "../models/oauth.js";

export const connectionStatus = pgEnum("connection_status", [
  ConnectionStatus.Active,
  ConnectionStatus.Inactive,
  ConnectionStatus.Error,
]);

export const oauthTransactionStatus = pgEnum("oauth_transaction_status", [
  OauthStatus.Pending,
  OauthStatus.Completed,
  OauthStatus.Failed,
  OauthStatus.Expired,
]);

export const ownershipScope = pgEnum("ownership_scope", [
  "user",
  "organization",
]);

export const connections = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: varchar("org_id", { length: 255 }).notNull(),
    // we need user_id to make sense of external account metadata
    userId: varchar("user_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 255 }).notNull(),
    externalAccountMetadata: jsonb("external_account_metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    status: connectionStatus("status")
      .notNull()
      .default(ConnectionStatus.Active),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_connections_org_id_provider_id_active").on(table.orgId, table.providerId).where(eq(table.status, ConnectionStatus.Active)),
  ],
);

export const tokens = pgTable(
  "tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectionId: uuid("connection_id")
      .references(() => connections.id)
      .notNull(),
    ownershipScope: ownershipScope("ownership_scope").notNull(),
    ownerId: text("owner_id").notNull(),
    tokenPayload: jsonb("token_payload")
      .$type<Record<string, unknown>>()
      .notNull(),
    scopes: text("scopes").array().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("unique_token_per_scope").on(
      table.connectionId,
      table.ownershipScope,
      table.ownerId,
    ),
  ],
);

export const oauthTransactions = pgTable("oauth_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(), // user who initiated the oauth transaction
  orgId: varchar("org_id", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  requestedScopes: text("requested_scopes").array().notNull(), // Array of strings
  state: varchar("state", { length: 255 }).notNull(),
  codeVerifier: text("code_verifier"), // For PKCE
  redirectUri: text("redirect_uri").notNull(),
  status: oauthTransactionStatus("status")
    .notNull()
    .default(OauthStatus.Pending),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // Transactions expire after 30 minutes
  finishedAt: timestamp("finished_at"),
});

export const documentStore = pgTable("document_store", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id").notNull(),
  documentId: text("document_id").notNull(),
  documentType: text("document_type").notNull(),
  documentUri: text("document_uri").notNull(),
});

export enum KnowledgeSnippetOrigin {
  AGENT = "agent",
}
export const knowledgeSnippetOrigin = pgEnum("knowledge_snippet_origin", [
  KnowledgeSnippetOrigin.AGENT,
]);

export const knowledgeSnippets = pgTable(
  "knowledge_snippets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id").notNull(),
    sourceRunId: text("source_run_id"),
    origin: knowledgeSnippetOrigin("origin")
      .notNull()
      .default(KnowledgeSnippetOrigin.AGENT),
    blob: text("blob"),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_knowledge_snippets_org_id_source_run_id").on(
      table.orgId,
      table.sourceRunId,
    ),
    index("embeddingIndex").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export const triggerRegistrations = pgTable("trigger_registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: text("agent_id").notNull(),
  providerId: text("provider_id").notNull(),
  connectionId: uuid("connection_id").references(() => connections.id, { onDelete: "cascade" }),
  triggerId: text("trigger_id").notNull(),
  params: jsonb("params").$type<Record<string, any>>().notNull().default({}),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const agentMemory = pgTable(
  "agent_memory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: text("agent_id").notNull(),
    memoryKey: text("memory_key").notNull(),
    data: jsonb("data").$type<unknown>().notNull(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("agent_memory_agent_key_idx").on(
      table.agentId,
      table.memoryKey,
    ),
    index("agent_memory_agent_id_idx").on(table.agentId),
    index("agent_memory_expires_at_idx").on(table.expiresAt),
  ],
);
