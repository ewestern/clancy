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
  integer,
} from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { ConnectionStatus } from "../models/connection.js";
import { OauthStatus } from "../models/oauth.js";
import { DocumentStatus } from "../models/documents.js";

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
    permissions: text("permissions").array().notNull(), // Array of canonical permission strings: providerId/itemId
    status: connectionStatus("status")
      .notNull()
      .default(ConnectionStatus.Active),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_connections_org_id_user_id_provider_id_active")
      .on(table.orgId, table.userId, table.providerId)
      .where(eq(table.status, ConnectionStatus.Active)),
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
  requestedPermissions: text("requested_permissions").array().notNull(), // Array of canonical permission strings: providerId/itemId
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

export const documentStatus = pgEnum("document_status", [
  DocumentStatus.Registered,
  DocumentStatus.Uploaded,
  DocumentStatus.Processing,
  DocumentStatus.Completed,
  DocumentStatus.Failed,
]);

export enum KnowledgeSnippetOrigin {
  AGENT = "agent",
  USER_UPLOAD = "user_upload",
}
export const knowledgeSnippetOrigin = pgEnum("knowledge_snippet_origin", [
  KnowledgeSnippetOrigin.AGENT,
  KnowledgeSnippetOrigin.USER_UPLOAD,
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
    summary: text("summary"),
    blob: text("blob"),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    // Ownership and provenance (not enforced for MVP)
    ownershipScope: ownershipScope("ownership_scope").default("organization"),
    ownerId: text("owner_id"),
    documentId: text("document_id"),
    chunkIndex: integer("chunk_index"),
    chunkCount: integer("chunk_count"),
    checksum: text("checksum"),
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
    index("idx_knowledge_snippets_org_id_document_id").on(
      table.orgId,
      table.documentId,
    ),
    uniqueIndex("uniq_knowledge_snippets_document_chunk").on(
      table.documentId,
      table.chunkIndex,
    ),
    uniqueIndex("uniq_knowledge_snippets_document_checksum").on(
      table.documentId,
      table.checksum,
    ),
  ],
);

export const triggerRegistrations = pgTable("trigger_registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id").notNull(),
  agentId: text("agent_id").notNull(),
  providerId: text("provider_id").notNull(),
  connectionId: uuid("connection_id").references(() => connections.id, {
    onDelete: "cascade",
  }),
  triggerId: text("trigger_id").notNull(),
  params: jsonb("params").$type<Record<string, any>>().notNull().default({}),
  subscriptionMetadata: jsonb("subscription_metadata")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
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

export const documentStore = pgTable("document_store", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id").notNull(),
  documentId: text("document_id").notNull(),
  documentType: text("document_type").notNull(),
  documentUri: text("document_uri").notNull(),
  title: text("title").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: text("size_bytes").notNull(),
  uploaderUserId: text("uploader_user_id").notNull(),
  ownershipScope: ownershipScope("ownership_scope")
    .notNull()
    .default("organization"),
  ownerId: text("owner_id").notNull(),
  status: documentStatus("status").notNull().default(DocumentStatus.Registered),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
// Tags for documents
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id").notNull(),
    name: text("name").notNull(),
    ///createdBy: text("created_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("uniq_tags_org_name").on(table.orgId, table.name),
    index("idx_tags_org_id").on(table.orgId),
  ],
);

export const documentTags = pgTable(
  "document_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id").notNull(),
    documentId: uuid("document_id")
      .references(() => documentStore.id, { onDelete: "cascade" })
      .notNull(),
    tagId: uuid("tag_id")
      .references(() => tags.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uniq_document_tag").on(
      table.orgId,
      table.documentId,
      table.tagId,
    ),
    index("idx_document_tags_org_tag").on(table.orgId, table.tagId),
    index("idx_document_tags_org_doc").on(table.orgId, table.documentId),
  ],
);
