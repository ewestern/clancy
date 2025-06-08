import { relations } from "drizzle-orm";
import { tokens, connections, triggerRegistrations } from "./schema.js";

export const tokensRelations = relations(tokens, ({ one }) => ({
  connection: one(connections, {
    fields: [tokens.connectionId],
    references: [connections.id],
  }),
}));

export const triggerRegistrationsRelations = relations(triggerRegistrations, ({ one }) => ({
  connection: one(connections, {
    fields: [triggerRegistrations.connectionId],
    references: [connections.id],
  }),
}));

export const connectionRelations = relations(connections, ({ many }) => ({
  triggerRegistrations: many(triggerRegistrations),
}));

