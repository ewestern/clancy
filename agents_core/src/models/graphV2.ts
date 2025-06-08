import { Type, Static } from "@sinclair/typebox";

/*
  Graph Design v2 core schemas and TypeScript types.
  These reflect the abstractions described in docs/GRAPH_DESIGN_V2.md.
*/

// ---------------------------------------------------------------------------
// 1. Skill (atomic unit)
// ---------------------------------------------------------------------------
export const SkillSpecSchema = Type.Object({
  id: Type.String({ description: "Unique skill identifier" }),
  provider: Type.String({ description: "Integration provider name (e.g. 'quickbooks')" }),
  action: Type.String({ description: "Capability action (e.g. 'invoice.create')" }),
  topology: Type.String({ description: "Canonical topology code (e.g. 'single_call.v1')" }),
  memoryRead: Type.Optional(Type.Array(Type.String(), { description: "Memory keys the skill reads" })),
  memoryWrite: Type.Optional(Type.Array(Type.String(), { description: "Memory keys the skill writes" })),
});
export type SkillSpec = Static<typeof SkillSpecSchema>;

// ---------------------------------------------------------------------------
// 2. Edges inside a workflow
// ---------------------------------------------------------------------------
export const GraphEdgeSchema = Type.Object({
  from: Type.String({ description: "Source node id" }),
  to: Type.String({ description: "Target node id" }),
  edgeKind: Type.Union([
    Type.Literal("data"),
    Type.Literal("control"),
  ], { description: "Edge semantics" }),
  payloadSchema: Type.Optional(Type.Record(Type.String(), Type.Unknown(), { description: "JSON schema for data payload if edgeKind === 'data'" })),
});
export type GraphEdge = Static<typeof GraphEdgeSchema>;

// ---------------------------------------------------------------------------
// 3. Workflow (collection of skills)
// ---------------------------------------------------------------------------
export const WorkflowSpecSchema = Type.Object({
  id: Type.String({ description: "Workflow identifier" }),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  nodes: Type.Array(SkillSpecSchema, { description: "Skills that belong to this workflow" }),
  edges: Type.Array(GraphEdgeSchema, { description: "Edges connecting skills" }),
});
export type WorkflowSpec = Static<typeof WorkflowSpecSchema>;

// ---------------------------------------------------------------------------
// 4. Digital Employee (top-level graph)
// ---------------------------------------------------------------------------
export const DigitalEmployeeSpecSchema = Type.Object({
  graphId: Type.String({ description: "Unique graph id (UUID)" }),
  version: Type.String({ description: "Semantic version of the employee spec" }),
  jobDescription: Type.String({ description: "Original job description" }),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  workflows: Type.Array(WorkflowSpecSchema, { description: "Contained workflow graphs" }),
  edges: Type.Optional(Type.Array(GraphEdgeSchema, { description: "(Rare) edges between workflows; usually empty" })),
});
export type DigitalEmployeeSpec = Static<typeof DigitalEmployeeSpecSchema>; 