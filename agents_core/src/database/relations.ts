import { relations } from "drizzle-orm";
import { digitalEmployees, graphRegistry } from "./schema";

export const digitalEmployeesRelations = relations(
  digitalEmployees,
  ({ one, many }) => ({
    graph: one(graphRegistry, {
      fields: [digitalEmployees.graphId],
      references: [graphRegistry.graphId],
    }),
  }),
);

export const graphRegistryRelations = relations(
  graphRegistry,
  ({ one, many }) => ({
    digitalEmployees: one(digitalEmployees, {
      fields: [graphRegistry.graphId],
      references: [digitalEmployees.graphId],
    }),
    parentGraph: one(graphRegistry, {
      fields: [graphRegistry.parentGraphId],
      references: [graphRegistry.graphId],
    }),
    childGraphs: many(graphRegistry, {
      relationName: "parentGraph",
    }),
  }),
);
