// interface Event
import { GraphType, StringEnum, UnionOneOf } from "./shared.js";
import { Static, Type } from "@sinclair/typebox";

export enum RunStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum TriggerType {
  MANUAL = "manual",
  SCHEDULED = "scheduled",
  API = "api",
}

export const RunStatusEnum = StringEnum([
  RunStatus.PENDING,
  RunStatus.RUNNING,
  RunStatus.COMPLETED,
  RunStatus.FAILED,
]);
export const TriggerTypeEnum = StringEnum([
  TriggerType.MANUAL,
  TriggerType.SCHEDULED,
  TriggerType.API,
]);
export const GraphTypeEnum = StringEnum([
  GraphType.DIGITAL_EMPLOYEE,
  GraphType.WORKFLOW,
]);

export const GraphDefinedSchema = Type.Object({
  event_type: Type.Literal("graph_defined"),
  graph_id: Type.String({ format: "uuid" }),
  version: Type.String(),
  type: GraphTypeEnum,
  author: Type.String(),
});

export const RunIntentEventSchema = Type.Object({
  event_type: Type.Literal("run_intent"),
  run_id: Type.String({ format: "uuid" }),
  graph_id: Type.String({ format: "uuid" }),
  org_id: Type.String({ format: "uuid" }),
  trigger_type: TriggerTypeEnum,
  payload: Type.Record(Type.String(), Type.Unknown()),
});

export const RunStartedSchema = Type.Object({
  event_type: Type.Literal("run_started"),
  run_id: Type.String({ format: "uuid" }),
  graph_id: Type.String({ format: "uuid" }),
  org_id: Type.String({ format: "uuid" }),
  status: RunStatusEnum,
});

export const RunCompletedSchema = Type.Object({
  event_type: Type.Literal("run_completed"),
  run_id: Type.String({ format: "uuid" }),
  graph_id: Type.String({ format: "uuid" }),
  org_id: Type.String({ format: "uuid" }),
  status: RunStatusEnum,
  duration: Type.Number(),
  output: Type.String(),
});

/// 

export const HILRequestedSchema = Type.Object({
  event_type: Type.Literal("hil_requested"),
  run_id: Type.String({ format: "uuid" }),
  graph_id: Type.String({ format: "uuid" }),
  org_id: Type.String({ format: "uuid" }),
  kind: Type.Union([Type.Literal("options"), Type.Literal("questions"), Type.Literal("approval")]),
  //messages: Type.Array(Type.Object({ role: Type.Union([Type.Literal("assistant"), Type.Literal("system")]), content: Type.String() })),
  //inputSchema: Type.Record(Type.String(), Type.Any()),
  options: Type.Optional(Type.Array(Type.Object({ id: Type.String(), label: Type.String(), description: Type.Optional(Type.String()) }))),
  questions: Type.Optional(Type.Array(Type.Object({ id: Type.String(), text: Type.String(), exampleAnswer: Type.Optional(Type.String()) }))),
});
export const HILResponseSchema = Type.Object({
  event_type: Type.Literal("hil_response"),
  run_id: Type.String({ format: "uuid" }),
  graph_id: Type.String({ format: "uuid" }),
  org_id: Type.String({ format: "uuid" }),
});



export const SkillRunStartedSchema = Type.Object({
  event_type: Type.Literal("skill_run_started"),
  run_id: Type.String({ format: "uuid" }),
  graph_id: Type.String({ format: "uuid" }),
  org_id: Type.String({ format: "uuid" }),
  status: RunStatusEnum,
});

export const SkillRunCompletedSchema = Type.Object({
  event_type: Type.Literal("skill_run_completed"),
  run_id: Type.String({ format: "uuid" }),
  graph_id: Type.String({ format: "uuid" }),
  org_id: Type.String({ format: "uuid" }),
  status: RunStatusEnum,
  duration: Type.Number(),
  output: Type.String(),
});

export const NodeStartedSchema = Type.Object({
  event_type: Type.Literal("node_started"),
  run_id: Type.String({ format: "uuid" }),
  node_id: Type.String(),
  graph_id: Type.String({ format: "uuid" }),
  org_id: Type.String({ format: "uuid" }),
  status: RunStatusEnum,
});

export const NodeCompletedSchema = Type.Object({
  event_type: Type.Literal("node_completed"),
  run_id: Type.String({ format: "uuid" }),
  node_id: Type.String(),
  graph_id: Type.String({ format: "uuid" }),
  org_id: Type.String({ format: "uuid" }),
  status: RunStatusEnum,
  duration: Type.Number(),
  output: Type.String(),
});

export const CheckpointSchema = Type.Object({
  event_type: Type.Literal("checkpoint"),
  run_id: Type.String({ format: "uuid" }),
  blob: Type.String(),
  timestamp: Type.String({ format: "date-time" }),
});

export const KnowledgeWriteSchema = Type.Object({
  event_type: Type.Literal("knowledge_write"),
  run_id: Type.String({ format: "uuid" }),
  content_uri: Type.String(),
  text_preview: Type.String(),
  visibility_scopes: Type.Array(Type.String()),
});

export const ExternalIngestionSchema = Type.Object({
  event_type: Type.Literal("external_ingestion"),
  org_id: Type.String({ format: "uuid" }),
  source: Type.String(),
  content_uri: Type.String(),
  visibility_scopes: Type.Array(Type.String()),
});

export const ExternalIngestionCompletedSchema = Type.Object({
  event_type: Type.Literal("external_ingestion_completed"),
  org_id: Type.String({ format: "uuid" }),
  content_uri: Type.String(),
});

//export const HumanReviewRequestedSchema = Type.Object({
//  event_type: Type.Literal("human_review_requested"),
//  run_id: Type.String({ format: "uuid" }),
//  task_id: Type.String({ format: "uuid" }),
//  reviewer: Type.String(),
//  diff_uri: Type.String(),
//});
//
//export const HumanReviewResolvedSchema = Type.Object({
//  event_type: Type.Literal("human_review_resolved"),
//  task_id: Type.String({ format: "uuid" }),
//  resolution: Type.String(),
//  comment: Type.String(),
//});

export const EventSchema = Type.Intersect([
  UnionOneOf([
    GraphDefinedSchema,
    RunIntentEventSchema,
    RunStartedSchema,
    RunCompletedSchema,
    SkillRunStartedSchema,
    SkillRunCompletedSchema,
    NodeStartedSchema,
    NodeCompletedSchema,
    CheckpointSchema,
    KnowledgeWriteSchema,
    ExternalIngestionSchema,
    ExternalIngestionCompletedSchema,
    HILRequestedSchema,
    HILResponseSchema,
  ]),
  Type.Object({
    created_at: Type.String({ format: "date-time" }),
    updated_at: Type.String({ format: "date-time" }),
  }),
]);

export type Event = Static<typeof EventSchema>;
export type RunIntentEvent = Static<typeof RunIntentEventSchema>;
//export type HumanReviewResolved = Static<typeof HumanReviewResolvedSchema>;
//export type HumanReviewRequested = Static<typeof HumanReviewRequestedSchema>;
export type ExternalIngestion = Static<typeof ExternalIngestionSchema>;
export type ExternalIngestionCompleted = Static<
  typeof ExternalIngestionCompletedSchema
>;
export type KnowledgeWrite = Static<typeof KnowledgeWriteSchema>;
export type Checkpoint = Static<typeof CheckpointSchema>;
export type NodeStarted = Static<typeof NodeStartedSchema>;
export type NodeCompleted = Static<typeof NodeCompletedSchema>;
export type SkillRunStarted = Static<typeof SkillRunStartedSchema>;
export type SkillRunCompleted = Static<typeof SkillRunCompletedSchema>;
