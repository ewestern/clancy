import { relations } from "drizzle-orm";
import {
  agents,
  employees,
  approvalRequests,
  agentRuns,
  agentRunActions,
} from "./schema.js";

export const agentRelations = relations(agents, ({ many, one }) => ({
  approvalRequests: many(approvalRequests),
  runs: many(agentRuns),
  employee: one(employees, {
    fields: [agents.employeeId],
    references: [employees.id],
  }),
}));

export const employeeRelations = relations(employees, ({ many }) => ({
  agents: many(agents),
}));

export const approvalRequestRelations = relations(
  approvalRequests,
  ({ one, many }) => ({
    agent: one(agents, {
      fields: [approvalRequests.agentId],
      references: [agents.id],
    }),
  }),
);

export const agentRunRelations = relations(agentRuns, ({ one, many }) => ({
  agent: one(agents, {
    fields: [agentRuns.agentId],
    references: [agents.id],
  }),
  actions: many(agentRunActions),
}));

export const agentRunActionRelations = relations(
  agentRunActions,
  ({ one }) => ({
    agentRun: one(agentRuns, {
      fields: [agentRunActions.agentRunId],
      references: [agentRuns.id],
    }),
  }),
);
