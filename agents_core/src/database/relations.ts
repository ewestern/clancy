import { relations } from "drizzle-orm";
import { agents, approvalRequests} from "./schema";


export const agentRelations = relations(
  agents,
  ({ many }) => ({
    approvalRequests: many(approvalRequests),
  }),
);

export const approvalRequestRelations = relations(
  approvalRequests,
  ({ one, many }) => ({
    agent: one(agents, {
      fields: [approvalRequests.agentId],
      references: [agents.agentId],
    }),
  }),
);
