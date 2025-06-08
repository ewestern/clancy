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


export const connections = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: varchar("org_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 255 }).notNull(),
    externalAccountMetadata: jsonb("external_account_metadata").$type<Record<string, unknown>>().notNull().default({}),
    status: connectionStatus("status")
      .notNull()
      .default(ConnectionStatus.Active),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    //uniqueIndex("idx_connections_org_id_provider_id_active").on(table.orgId, table.providerId).where(eq(table.status, ConnectionStatus.Active)),
  ],
);

export const tokens = pgTable("tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  connectionId: uuid("connection_id")
    .references(() => connections.id)
    .notNull(),
  tokenPayload: jsonb("token_payload")
    .$type<Record<string, unknown>>()
    .notNull(),
  scopes: text("scopes").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const oauthTransactions = pgTable("oauth_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
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


export const knowledgeSnippets = pgTable("knowledge_snippets", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id").notNull(),
  sourceRunId: text("source_run_id"),
  origin: knowledgeSnippetOrigin("origin").notNull().default(KnowledgeSnippetOrigin.AGENT),
  blob: text("blob"),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_knowledge_snippets_org_id_source_run_id").on(table.orgId, table.sourceRunId),
  index('embeddingIndex').using('hnsw', table.embedding.op('vector_cosine_ops')),
]);


export enum ConversationStatus {
  Open = "open",
  Closed = "closed",
}

export const conversationStatus = pgEnum("conversation_status", [
  ConversationStatus.Open,
  ConversationStatus.Closed,
]);


export const externalConversations = pgTable("external_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: varchar("org_id", { length: 255 }).notNull(),
  providerId: varchar("provider_id", { length: 255 }).notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  conversationId: text("conversation_id").notNull(),
  subContext: text("sub_context"),
  runId: text("run_id"),
  status: conversationStatus("status")
    .notNull()
    .default(ConversationStatus.Open),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversationMessages = pgTable("conversation_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .references(() => externalConversations.id)
    .notNull(),
  providerId: varchar("provider_id", { length: 255 }).notNull(),
  providerMessageId: text("provider_message_id").notNull(),
  content: jsonb("content").$type<Record<string, any>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const triggerRegistrations = pgTable("trigger_registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: text("agent_id").notNull(),
  connectionId: uuid("connection_id").references(() => connections.id),
  triggerId: text("trigger_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>().notNull().default({}),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});