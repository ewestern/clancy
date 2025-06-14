import {
  Kind,
  SchemaOptions,
  Static,
  TSchema,
  Type,
  TypeRegistry,
} from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { PromptRegistry } from "../prompts/promptRegistry";

export const StringEnum = <T extends string[]>(
  values: [...T],
  opts?: SchemaOptions,
) =>
  Type.Unsafe<T[number]>({
    type: "string",
    enum: values,
    ...opts,
  });

export interface TUnionOneOf<T extends TSchema[]> extends TSchema {
  [Kind]: "UnionOneOf";
  static: { [K in keyof T]: Static<T[K]> }[number];
  oneOf: T;
}
// -------------------------------------------------------------------------------------
// UnionOneOf
// -------------------------------------------------------------------------------------
/** `[Experimental]` Creates a Union type with a `oneOf` schema representation */
export function UnionOneOf<T extends TSchema[]>(
  oneOf: [...T],
  options: SchemaOptions = {},
) {
  function UnionOneOfCheck(schema: TUnionOneOf<TSchema[]>, value: unknown) {
    return (
      1 ===
      schema.oneOf.reduce(
        (acc: number, schema: any) =>
          Value.Check(schema, value) ? acc + 1 : acc,
        0,
      )
    );
  }
  if (!TypeRegistry.Has("UnionOneOf"))
    TypeRegistry.Set("UnionOneOf", UnionOneOfCheck);
  return { ...options, [Kind]: "UnionOneOf", oneOf } as TUnionOneOf<T>;
}
export enum GraphType {
  DIGITAL_EMPLOYEE = "digital_employee",
  SKILL = "skill",
}
// Standard Error Schema
export const ErrorSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
  statusCode: Type.Number(),
  timestamp: Type.String({ format: "date-time" }),
  path: Type.Optional(Type.String()),
  details: Type.Optional(Type.Unknown()),
});

// Health Response Schema
export const HealthResponseSchema = Type.Object({
  status: Type.Union([Type.Literal("healthy"), Type.Literal("unhealthy")]),
  timestamp: Type.String({ format: "date-time" }),
  version: Type.String(),
  dependencies: Type.Object({
    database: Type.Union([Type.Literal("healthy"), Type.Literal("unhealthy")]),
    redis: Type.Union([Type.Literal("healthy"), Type.Literal("unhealthy")]),
    connectIq: Type.Union([Type.Literal("healthy"), Type.Literal("unhealthy")]),
    authService: Type.Union([
      Type.Literal("healthy"),
      Type.Literal("unhealthy"),
    ]),
  }),
});

// Trigger Schema
export const TriggerSchema = Type.Object({
  type: Type.Union([
    Type.Literal("direct_command"),
    Type.Literal("schedule"),
    Type.Literal("external_event"),
    Type.Literal("internal_event"),
  ]),
  organizationId: Type.String({ format: "uuid" }),
  payload: Type.Record(Type.String(), Type.Unknown()),
  source: Type.String(),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

// Agent Identity Schema
export const AgentIdentitySchema = Type.Object({
  agentId: Type.String({ format: "uuid" }),
  organizationId: Type.String({ format: "uuid" }),
  role: Type.String(),
  capabilities: Type.Array(Type.String()),
  createdAt: Type.String({ format: "date-time" }),
  lastActive: Type.Optional(Type.String({ format: "date-time" })),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

// Create Agent Schema
export const CreateAgentSchema = Type.Object({
  role: Type.String({ minLength: 1, maxLength: 255 }),
  capabilities: Type.Array(Type.String()),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

// Update Agent Schema
export const UpdateAgentSchema = Type.Object({
  role: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  capabilities: Type.Optional(Type.Array(Type.String())),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

// Execution Result Schema
export const ExecutionResultSchema = Type.Object({
  executionId: Type.String({ format: "uuid" }),
  agentId: Type.String({ format: "uuid" }),
  status: Type.Union([
    Type.Literal("queued"),
    Type.Literal("running"),
    Type.Literal("completed"),
    Type.Literal("failed"),
  ]),
  result: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  error: Type.Optional(Type.String()),
});

// Multi-Agent System Creation Schema
export const CreateMultiAgentSystemSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255 }),
  jobDescription: Type.String({ minLength: 1, maxLength: 5000 }),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

// Node Spec Schema
export const NodeSpecSchema = Type.Object({
  id: Type.String(),
  type: Type.String(),
  config: Type.Record(Type.String(), Type.Unknown()),
});

// Agent Spec Schema
export const AgentSpecSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.String(),
  category: Type.String(),
  nodes: Type.Array(NodeSpecSchema),
  edges: Type.Array(Type.Array(Type.String())),
  specification: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

// Inter-Agent Message Schema
export const InterAgentMessageSchema = Type.Object({
  from: Type.String(),
  to: Type.String(),
  messageType: Type.String(),
  schema: Type.Record(Type.String(), Type.Unknown()),
});

// Multi-Agent Spec Schema
export const MultiAgentSpecSchema = Type.Object({
  version: Type.String(),
  jobDescription: Type.String(),
  agents: Type.Array(AgentSpecSchema),
  interAgentMessages: Type.Array(InterAgentMessageSchema),
  executionMode: Type.String(),
});

// Query Schemas
export const PaginationQuerySchema = Type.Object({
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
  offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
});

export const ExecutionQuerySchema = Type.Intersect([
  PaginationQuerySchema,
  Type.Object({
    status: Type.Optional(
      Type.Union([
        Type.Literal("queued"),
        Type.Literal("running"),
        Type.Literal("completed"),
        Type.Literal("failed"),
      ]),
    ),
    since: Type.Optional(Type.String({ format: "date-time" })),
  }),
]);

export const AgentQuerySchema = Type.Intersect([
  PaginationQuerySchema,
  Type.Object({
    role: Type.Optional(Type.String()),
    capability: Type.Optional(Type.String()),
  }),
]);

// Path Parameter Schemas
export const UuidParamSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
});

export const OrgIdParamSchema = Type.Object({
  orgId: Type.String({ format: "uuid" }),
});

export const AgentIdParamSchema = Type.Object({
  agentId: Type.String({ format: "uuid" }),
});

export const ExecutionIdParamSchema = Type.Object({
  executionId: Type.String({ format: "uuid" }),
});
// Use the schema from PromptRegistry
//export /const PromptTemplateSchema = PromptRegistry.Schema;

export const PromptVersionComparisonSchema = Type.Object({
  version1: Type.Object({
    version: Type.String(),
    performance: Type.Any(),
  }),
  version2: Type.Object({
    version: Type.String(),
    performance: Type.Any(),
  }),
  comparison: Type.Object({
    successRateDiff: Type.Number(),
    qualityScoreDiff: Type.Number(),
    responseTimeDiff: Type.Number(),
  }),
});

export const ABTestRequestSchema = Type.Object({
  promptId: Type.String(),
  versions: Type.Array(Type.String()),
  testInput: Type.Object({
    jobDescription: Type.String(),
  }),
  iterations: Type.Optional(Type.Number({ minimum: 1, maximum: 10 })),
});

export const ABTestResultSchema = Type.Object({
  promptId: Type.String(),
  versions: Type.Array(Type.String()),
  results: Type.Array(
    Type.Object({
      version: Type.String(),
      iterations: Type.Number(),
      results: Type.Array(Type.Any()),
      metrics: Type.Any(),
    }),
  ),
  recommendation: Type.Object({
    bestVersion: Type.String(),
    reason: Type.String(),
    confidence: Type.Number(),
  }),
});

// Prompt template schema using TypeBox
export const PromptTemplateSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  version: Type.String(),
  content: Type.String(),
  variables: Type.Array(Type.String()),
  metadata: Type.Object({
    description: Type.String(),
    author: Type.String(),
    createdAt: Type.String(),
    tags: Type.Optional(Type.Array(Type.String())),
    modelRecommendations: Type.Optional(Type.Array(Type.String())),
  }),
  performance: Type.Optional(
    Type.Object({
      successRate: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
      avgResponseTime: Type.Optional(Type.Number({ minimum: 0 })),
      qualityScore: Type.Optional(Type.Number({ minimum: 0, maximum: 10 })),
      totalUsage: Type.Number({ minimum: 0, default: 0 }),
    }),
  ),
});
export const GetPromptsEndpoint = {
  tags: ["Prompts"],
  summary: "List all prompt templates",
  response: {
    200: Type.Array(PromptTemplateSchema),
  },
};

export type PromptTemplate = Static<typeof PromptTemplateSchema>;

export const GetPromptEndpoint = {
  tags: ["Prompts"],
  summary: "Get all versions of a specific prompt",
  params: Type.Object({
    promptId: Type.String(),
  }),
  response: {
    200: Type.Array(PromptTemplateSchema),
    404: ErrorSchema,
  },
};

export const GetActivePromptEndpoint = {
  tags: ["Prompts"],
  summary: "Get the active version of a prompt",
  params: Type.Object({
    promptId: Type.String(),
  }),
  response: {
    200: PromptTemplateSchema,
    404: ErrorSchema,
  },
};

export const SetActivePromptEndpoint = {
  tags: ["Prompts"],
  summary: "Set the active version of a prompt",
  params: Type.Object({
    promptId: Type.String(),
    version: Type.String(),
  }),
  response: {
    200: Type.Object({
      message: Type.String(),
      promptId: Type.String(),
      activeVersion: Type.String(),
    }),
    404: ErrorSchema,
  },
};

export const ComparePromptVersionsEndpoint = {
  tags: ["Prompts"],
  summary: "Compare performance between two prompt versions",
  params: Type.Object({
    promptId: Type.String(),
    version1: Type.String(),
    version2: Type.String(),
  }),
  response: {
    200: PromptVersionComparisonSchema,
    404: ErrorSchema,
  },
};

export const ABTestPromptsEndpoint = {
  tags: ["Prompts"],
  summary: "Run A/B tests between prompt versions",
  body: ABTestRequestSchema,
  response: {
    200: ABTestResultSchema,
    400: ErrorSchema,
  },
};

export const GetPromptMetricsEndpoint = {
  tags: ["Prompts"],
  summary: "Get performance metrics for all versions of a prompt",
  params: Type.Object({
    promptId: Type.String(),
  }),
  response: {
    200: Type.Array(
      Type.Object({
        version: Type.String(),
        metrics: Type.Any(),
      }),
    ),
    404: ErrorSchema,
  },
};
