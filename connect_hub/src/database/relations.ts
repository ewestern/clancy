import { relations } from "drizzle-orm";
import {
  tokens,
  connections,
  triggerRegistrations,
  documentTags,
  documentStore,
  tags,
} from "./schema.js";

export const tokensRelations = relations(tokens, ({ one }) => ({
  connection: one(connections, {
    fields: [tokens.connectionId],
    references: [connections.id],
  }),
}));

export const triggerRegistrationsRelations = relations(
  triggerRegistrations,
  ({ one }) => ({
    connection: one(connections, {
      fields: [triggerRegistrations.connectionId],
      references: [connections.id],
    }),
  }),
);

export const connectionRelations = relations(connections, ({ many, one }) => ({
  triggerRegistrations: many(triggerRegistrations),
  token: one(tokens, {
    fields: [connections.id],
    references: [tokens.connectionId],
  }),
}));

export const tokenRelations = relations(tokens, ({ one }) => ({
  connection: one(connections, {
    fields: [tokens.connectionId],
    references: [connections.id],
  }),
}));

export const documentRelations = relations(documentStore, ({ many, one }) => ({
  documentTags: many(documentTags),
}));

export const documentTagRelations = relations(documentTags, ({ one }) => ({
  tag: one(tags, {
    fields: [documentTags.tagId],
    references: [tags.id],
  }),
  document: one(documentStore, {
    fields: [documentTags.documentId],
    references: [documentStore.id],
  }),
}));

export const tagRelations = relations(tags, ({ many }) => ({
  documentTags: many(documentTags),
}));
