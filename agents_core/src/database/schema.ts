import { pgTable, uuid, varchar, timestamp, jsonb, index, text } from 'drizzle-orm/pg-core';

export const agents = pgTable('agents', {
  agentId: uuid('agent_id').primaryKey().defaultRandom(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  role: varchar('role', { length: 255 }).notNull(),
  capabilities: jsonb('capabilities').$type<string[]>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActive: timestamp('last_active'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
}, (table) => ({
  orgIndex: index('agents_org_idx').on(table.organizationId),
  roleIndex: index('agents_role_idx').on(table.role),
}));

export const executions = pgTable('executions', {
  executionId: uuid('execution_id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  triggerType: varchar('trigger_type', { length: 50 }).notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  result: jsonb('result').$type<Record<string, any>>(),
  errorMessage: text('error_message'),
}, (table) => ({
  agentIndex: index('executions_agent_idx').on(table.agentId),
  orgIndex: index('executions_org_idx').on(table.organizationId),
  statusIndex: index('executions_status_idx').on(table.status),
}));

export const eventProjections = pgTable('event_projections', {
  eventId: uuid('event_id').primaryKey().defaultRandom(),
  orgId: varchar('org_id', { length: 255 }).notNull(),
  agentId: uuid('agent_id'),
  executionId: uuid('execution_id'),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: jsonb('payload').$type<Record<string, any>>().notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  scopes: jsonb('scopes').$type<string[]>(),
}, (table) => ({
  orgIndex: index('events_org_idx').on(table.orgId),
  agentIndex: index('events_agent_idx').on(table.agentId),
  executionIndex: index('events_execution_idx').on(table.executionId),
  typeIndex: index('events_type_idx').on(table.eventType),
  timestampIndex: index('events_timestamp_idx').on(table.timestamp),
}));

export const multiAgentSystems = pgTable('multi_agent_systems', {
  systemId: uuid('system_id').primaryKey().defaultRandom(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  jobDescription: text('job_description').notNull(),
  specification: jsonb('specification').$type<Record<string, any>>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('active'),
}, (table) => ({
  orgIndex: index('systems_org_idx').on(table.organizationId),
  statusIndex: index('systems_status_idx').on(table.status),
  createdAtIndex: index('systems_created_at_idx').on(table.createdAt),
}));

// Type exports for use in application code
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;

export type Execution = typeof executions.$inferSelect;
export type NewExecution = typeof executions.$inferInsert;

export type EventProjection = typeof eventProjections.$inferSelect;
export type NewEventProjection = typeof eventProjections.$inferInsert;

export type MultiAgentSystem = typeof multiAgentSystems.$inferSelect;
export type NewMultiAgentSystem = typeof multiAgentSystems.$inferInsert; 