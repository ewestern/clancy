import { relations } from "drizzle-orm";
import { agents, employees, approvalRequests } from "./schema.js";

export const agentRelations = relations(agents, ({ many, one }) => ({
  approvalRequests: many(approvalRequests),
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
