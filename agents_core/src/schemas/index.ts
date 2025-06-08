import { Type } from '@sinclair/typebox';

// Standard Error Schema
export const ErrorSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
  statusCode: Type.Number(),
  timestamp: Type.String({ format: 'date-time' }),
  path: Type.Optional(Type.String()),
  details: Type.Optional(Type.Unknown()),
});

// Health Response Schema
export const HealthResponseSchema = Type.Object({
  status: Type.Union([Type.Literal('healthy'), Type.Literal('unhealthy')]),
  timestamp: Type.String({ format: 'date-time' }),
  version: Type.String(),
  dependencies: Type.Object({
    database: Type.Union([Type.Literal('healthy'), Type.Literal('unhealthy')]),
    redis: Type.Union([Type.Literal('healthy'), Type.Literal('unhealthy')]),
    connectIq: Type.Union([Type.Literal('healthy'), Type.Literal('unhealthy')]),
    authService: Type.Union([Type.Literal('healthy'), Type.Literal('unhealthy')]),
  }),
});

// Trigger Schema
export const TriggerSchema = Type.Object({
  type: Type.Union([
    Type.Literal('direct_command'),
    Type.Literal('schedule'),
    Type.Literal('external_event'),
    Type.Literal('internal_event'),
  ]),
  organizationId: Type.String({ format: 'uuid' }),
  payload: Type.Record(Type.String(), Type.Unknown()),
  source: Type.String(),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

// Agent Identity Schema
export const AgentIdentitySchema = Type.Object({
  agentId: Type.String({ format: 'uuid' }),
  organizationId: Type.String({ format: 'uuid' }),
  role: Type.String(),
  capabilities: Type.Array(Type.String()),
  createdAt: Type.String({ format: 'date-time' }),
  lastActive: Type.Optional(Type.String({ format: 'date-time' })),
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
  executionId: Type.String({ format: 'uuid' }),
  agentId: Type.String({ format: 'uuid' }),
  status: Type.Union([
    Type.Literal('queued'),
    Type.Literal('running'),
    Type.Literal('completed'),
    Type.Literal('failed'),
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
    status: Type.Optional(Type.Union([
      Type.Literal('queued'),
      Type.Literal('running'),
      Type.Literal('completed'),
      Type.Literal('failed'),
    ])),
    since: Type.Optional(Type.String({ format: 'date-time' })),
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
  id: Type.String({ format: 'uuid' }),
});

export const OrgIdParamSchema = Type.Object({
  orgId: Type.String({ format: 'uuid' }),
});

export const AgentIdParamSchema = Type.Object({
  agentId: Type.String({ format: 'uuid' }),
});

export const ExecutionIdParamSchema = Type.Object({
  executionId: Type.String({ format: 'uuid' }),
}); 