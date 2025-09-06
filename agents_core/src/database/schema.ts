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
import { AgentActionStatus, AgentRunStatus } from "../models/runs.js";
import { TemplateStatus } from "../models/templates.js";

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
    employeeId: uuid("employee_id")
      .references(() => employees.id)
      .notNull(),
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

export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: varchar("org_id", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  name: text("name").notNull(),
  status: employeeStatus("status").notNull().default(EmployeeStatus.Active),
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

export const agentRunStatus = pgEnum("agent_run_status", [
  AgentRunStatus.Running,
  AgentRunStatus.Completed,
  AgentRunStatus.Failed,
]);

export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .references(() => agents.id)
    .notNull(),
  executionId: text("execution_id").notNull(),
  status: agentRunStatus("status").notNull().default(AgentRunStatus.Running),
  result: jsonb("result").$type<Record<string, any>>().notNull().default({}),
  runStartedAt: timestamp("run_started_at").notNull(),
  runCompletedAt: timestamp("run_completed_at"),
});

export const agentRunActionStatus = pgEnum("agent_run_action_status", [
  AgentActionStatus.Success,
  AgentActionStatus.Running,
  AgentActionStatus.Error,
]);

export const agentRunActions = pgTable("agent_run_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentRunId: uuid("agent_run_id")
    .references(() => agentRuns.id)
    .notNull(),
  providerId: text("provider_id").notNull(),
  capabilityId: text("capability_id").notNull(),
  formattedRequest: jsonb("formatted_request")
    .$type<Record<string, any>>()
    .notNull()
    .default({}),
  result: jsonb("result").$type<Record<string, any>>().notNull().default({}),
  status: agentRunActionStatus("status")
    .notNull()
    .default(AgentActionStatus.Running),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});



export const templateStatus = pgEnum("template_status", [
  TemplateStatus.Active,
  TemplateStatus.Inactive,
]);

export const templates = pgTable(
  "templates",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    status: templateStatus("status").notNull().default(TemplateStatus.Active),
    headline: text("headline").notNull(),
    promise: text("promise").notNull(),
    category: varchar("category", { length: 255 }).notNull(),
    integrations: jsonb("integrations").$type<string[]>().notNull().default([]),
    jdSeed: text("jd_seed").notNull(),
    icon: varchar("icon", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("templates_category_idx").on(table.category)],
);
