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
import { ApprovalRequestStatus } from "../models/approvals";

export const agents = pgTable(
  "agents",
  {
    agentId: text("agent_id").primaryKey(),
    organizationId: varchar("organization_id", { length: 255 }).notNull(),
    role: varchar("role", { length: 255 }).notNull(),
    prompt: text("prompt").notNull(),
    capabilities: text("capabilities").array().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastActive: timestamp("last_active"),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    parentAgentId: uuid("parent_agent_id"),
  },
  (table) => [
    index("agents_org_idx").on(table.organizationId),
    index("agents_role_idx").on(table.role),
  ],
);


export const approvalRequestStatus = pgEnum("approval_request_status", [
  ApprovalRequestStatus.Pending,
  ApprovalRequestStatus.Approved,
  ApprovalRequestStatus.Rejected,
]);


export const approvalRequests = pgTable("approval_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: text("agent_id"),// .references(() => agents.agentId).notNull(),
  runId: text("run_id").notNull(),
  status: approvalRequestStatus("status").notNull().default(ApprovalRequestStatus.Pending),
  summary: text("summary").notNull(),
  modifications: jsonb("modifications").$type<Record<string, any>>().notNull().default({}),
  capability: text("capability").notNull(),
  request: jsonb("request").$type<Record<string, any>>().notNull().default({}),
  //metadata: jsonb("metadata").$type<Record<string, any>>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

