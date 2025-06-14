// interface Event
import { GraphType, StringEnum, UnionOneOf } from ".";
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
  GraphType.SKILL,
]);

//export const EventSchema = Type.Object({
//    created_at: Type.String({ format: "date-time" }),
//    updated_at: Type.String({ format: "date-time" }),
//});

export const GraphDefinedSchema = Type.Object({
  graph_id: Type.String({ format: "uuid" }),
  version: Type.String(),
  type: GraphTypeEnum,
  author: Type.String(),
});

export const RunIntentEventSchema = Type.Object({
  run_id: Type.String({ format: "uuid" }),
  graph_id: Type.String({ format: "uuid" }),
  org_id: Type.String({ format: "uuid" }),
  trigger_type: TriggerTypeEnum,
});

export const RunStartedSchema = Type.Object({
  run_id: Type.String({ format: "uuid" }),
  graph_id: Type.String({ format: "uuid" }),
  org_id: Type.String({ format: "uuid" }),
  status: RunStatusEnum,
});

export const RunCompletedSchema = Type.Object({
  run_id: Type.String({ format: "uuid" }),
  graph_id: Type.String({ format: "uuid" }),
  org_id: Type.String({ format: "uuid" }),
  status: RunStatusEnum,
  duration: Type.Number(),
  output: Type.String(),
});

export const SkillRunStartedSchema = Type.Object({
  run_id: Type.String({ format: "uuid" }),
  graph_id: Type.String({ format: "uuid" }),
  org_id: Type.String({ format: "uuid" }),
  status: RunStatusEnum,
});

export const SkillRunCompletedSchema = Type.Object({
  run_id: Type.String({ format: "uuid" }),
  graph_id: Type.String({ format: "uuid" }),
  org_id: Type.String({ format: "uuid" }),
  status: RunStatusEnum,
  duration: Type.Number(),
  output: Type.String(),
});

export const NodeStartedSchema = Type.Object({
  run_id: Type.String({ format: "uuid" }),
  node_id: Type.String(),
  graph_id: Type.String({ format: "uuid" }),
  org_id: Type.String({ format: "uuid" }),
  status: RunStatusEnum,
});

export const NodeCompletedSchema = Type.Object({
  run_id: Type.String({ format: "uuid" }),
  node_id: Type.String(),
  graph_id: Type.String({ format: "uuid" }),
  org_id: Type.String({ format: "uuid" }),
  status: RunStatusEnum,
  duration: Type.Number(),
  output: Type.String(),
});

export const CheckpointSchema = Type.Object({
  run_id: Type.String({ format: "uuid" }),
  blob: Type.String(),
  timestamp: Type.String({ format: "date-time" }),
});

export const KnowledgeWriteSchema = Type.Object({
  run_id: Type.String({ format: "uuid" }),
  content_uri: Type.String(),
  text_preview: Type.String(),
  visibility_scopes: Type.Array(Type.String()),
});

export const ExternalIngestionSchema = Type.Object({
  org_id: Type.String({ format: "uuid" }),
  source: Type.String(),
  content_uri: Type.String(),
  visibility_scopes: Type.Array(Type.String()),
});

export const ExternalIngestionCompletedSchema = Type.Object({
  org_id: Type.String({ format: "uuid" }),
  content_uri: Type.String(),
});

export const HumanReviewRequestedSchema = Type.Object({
  run_id: Type.String({ format: "uuid" }),
  task_id: Type.String({ format: "uuid" }),
  reviewer: Type.String(),
  diff_uri: Type.String(),
});

export const HumanReviewResolvedSchema = Type.Object({
  task_id: Type.String({ format: "uuid" }),
  resolution: Type.String(),
  comment: Type.String(),
});

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
    HumanReviewRequestedSchema,
    HumanReviewResolvedSchema,
  ]),
  Type.Object({
    created_at: Type.String({ format: "date-time" }),
    updated_at: Type.String({ format: "date-time" }),
  }),
]);

export type Event = Static<typeof EventSchema>;
export type RunIntentEvent = Static<typeof RunIntentEventSchema>;
export type HumanReviewResolved = Static<typeof HumanReviewResolvedSchema>;
export type HumanReviewRequested = Static<typeof HumanReviewRequestedSchema>;
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
