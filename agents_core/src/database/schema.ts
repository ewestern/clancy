import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  index,
  text,
  boolean,
  integer,
  real,
  pgEnum,
} from "drizzle-orm/pg-core";
import { ApprovalRequestStatus } from "../models/approvals.js";
import { Agent, AgentStatus } from "../models/agents.js";
import { EmployeeStatus } from "../models/employees.js";

export const agentStatus = pgEnum("agent_status", [
  AgentStatus.Active,
  AgentStatus.Inactive,
]);

export const employeeStatus = pgEnum("employee_status", [
  EmployeeStatus.Active,
  EmployeeStatus.Inactive,
]);

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: varchar("org_id", { length: 255 }).notNull(), // should we keep this w/ owner id?
    userId: varchar("user_id", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull(),
    prompt: text("prompt").notNull(),
    // NB: We probably want to change this to `subagents`, which will be a collection of capabilities + prompts.
    capabilities: jsonb("capabilities")
      .$type<Agent["capabilities"]>()
      .notNull(),
    trigger: jsonb("trigger").$type<Agent["trigger"]>().notNull(),
    aiEmployeeId: uuid("ai_employee_id").references(() => aiEmployees.id),
    lastActive: timestamp("last_active"),
    status: agentStatus("status").notNull().default(AgentStatus.Active),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("agents_org_idx").on(table.orgId)],
);

export const aiEmployees = pgTable("ai_employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: varchar("org_id", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const approvalRequestStatus = pgEnum("approval_request_status", [
  ApprovalRequestStatus.Pending,
  ApprovalRequestStatus.Approved,
  ApprovalRequestStatus.Rejected,
]);

export const approvalRequests = pgTable("approval_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: text("agent_id"), // .references(() => agents.agentId).notNull(),
  runId: text("run_id").notNull(),
  status: approvalRequestStatus("status")
    .notNull()
    .default(ApprovalRequestStatus.Pending),
  summary: text("summary").notNull(),
  modifications: jsonb("modifications")
    .$type<Record<string, any>>()
    .notNull()
    .default({}),
  capability: text("capability").notNull(),
  request: jsonb("request").$type<Record<string, any>>().notNull().default({}),
  //metadata: jsonb("metadata").$type<Record<string, any>>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export enum ConversationStatus {
  Open = "open",
  Closed = "closed",
}

export const conversationStatus = pgEnum("conversation_status", [
  ConversationStatus.Open,
  ConversationStatus.Closed,
]);

export const agentConversations = pgTable("agent_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: varchar("org_id", { length: 255 }).notNull(),
  providerId: varchar("provider_id", { length: 255 }).notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id)
    .notNull(),
  subContext: text("sub_context"),
  runId: text("run_id"),
  status: conversationStatus("status")
    .notNull()
    .default(ConversationStatus.Open),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const conversationMessages = pgTable("conversation_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .references(() => agentConversations.id)
    .notNull(),
  providerId: varchar("provider_id", { length: 255 }).notNull(),
  providerMessageId: text("provider_message_id"),
  content: jsonb("content").$type<Record<string, any>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
