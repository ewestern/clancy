import { Static, Type } from "@sinclair/typebox";
import { ErrorSchema, Ref, StringEnum } from "./shared.js";

export enum AgentRunStatus {
  Running = "running",
  Completed = "completed",
  Failed = "failed",
}

export const AgentRunStatusSchema = StringEnum(
  [AgentRunStatus.Running, AgentRunStatus.Completed, AgentRunStatus.Failed],
  { $id: "AgentRunStatus" },
);

export const RunActionSchema = Type.Object(
  {
    id: Type.String(),
    agentRunId: Type.String(),
    providerId: Type.String(),
    capabilityId: Type.String(),
    formattedRequest: Type.Record(Type.String(), Type.Any()),
    result: Type.Record(Type.String(), Type.Any()),
    status: Type.String(),
    createdAt: Type.String({ format: "date-time" }),
  },
  { $id: "RunAction" },
);

export const RunSchema = Type.Object(
  {
    id: Type.String(),
    agentId: Type.String(),
    executionId: Type.String(),
    status: Ref(AgentRunStatusSchema),
    result: Type.Record(Type.String(), Type.Any()),
    runStartedAt: Type.String({ format: "date-time" }),
    runCompletedAt: Type.Optional(Type.String({ format: "date-time" })),
    actions: Type.Optional(Type.Array(Ref(RunActionSchema))),
  },
  { $id: "Run" },
);

export enum AgentActionStatus {
  Success = "success",
  Error = "error",
  Running = "running",
}
export const AgentActionStatusSchema = StringEnum(
  [
    AgentActionStatus.Success,
    AgentActionStatus.Running,
    AgentActionStatus.Error,
  ],
  { $id: "AgentActionStatus" },
);

export const ActivityEventSchema = Type.Object(
  {
    id: Type.String(),
    timestamp: Type.String({ format: "date-time" }),
    type: Ref(AgentActionStatusSchema),
    //node: Type.String(),
    message: Type.String(),
    durationMs: Type.Optional(Type.Number()),
    runId: Type.String(),
    workflowId: Type.String(),
    workflowName: Type.String(),
  },
  { $id: "ActivityEvent" },
);

export type RunAction = Static<typeof RunActionSchema>;
export type Run = Static<typeof RunSchema>;
export type ActivityEvent = Static<typeof ActivityEventSchema>;

// Endpoint schemas
export const ListRunsEndpoint = {
  tags: ["Runs"],
  summary: "List runs",
  description: "List runs with optional filtering",
  security: [{ bearerAuth: [] }],
  querystring: Type.Object({
    employeeId: Type.Optional(Type.String()),
    agentId: Type.Optional(Type.String()),
    status: Type.Optional(Ref(AgentRunStatusSchema)),
    limit: Type.Optional(
      Type.Number({ minimum: 1, maximum: 100, default: 50 }),
    ),
    offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
    includeActions: Type.Optional(Type.Boolean({ default: false })),
  }),
  response: {
    200: Type.Array(Ref(RunSchema)),
  },
};

export const GetRunEndpoint = {
  tags: ["Runs"],
  summary: "Get a run by ID",
  description: "Get a run by ID with its actions",
  security: [{ bearerAuth: [] }],
  params: Type.Object({
    id: Type.String(),
  }),
  response: {
    200: Ref(RunSchema),
    404: ErrorSchema,
  },
};

export const ListRunEventsEndpoint = {
  tags: ["Runs"],
  summary: "List run events for activity log",
  description: "List flattened activity events from runs and actions",
  security: [{ bearerAuth: [] }],
  querystring: Type.Object({
    employeeId: Type.String(),
    agentId: Type.Optional(Type.String()),
    limit: Type.Optional(
      Type.Number({ minimum: 1, maximum: 100, default: 50 }),
    ),
    offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
  }),
  response: {
    200: Type.Array(Ref(ActivityEventSchema)),
  },
};
