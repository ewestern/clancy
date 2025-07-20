import { relations } from "drizzle-orm";
import { agents, aiEmployees, approvalRequests } from "./schema.js";

export const agentRelations = relations(agents, ({ many, one }) => ({
  approvalRequests: many(approvalRequests),
  aiEmployee: one(aiEmployees, {
    fields: [agents.aiEmployeeId],
    references: [aiEmployees.id],
  }),
}));

export const aiEmployeeRelations = relations(aiEmployees, ({ many }) => ({
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
