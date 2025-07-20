import {
  Kind,
  SchemaOptions,
  Static,
  TSchema,
  Type,
  TypeRegistry,
} from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export const TDate = (opts?: SchemaOptions) =>
  Type.Transform(Type.String(opts))
    .Decode((value) => new Date(value))
    .Encode((value) => value.toISOString().split("T")[0]!);

export const Ref = <T extends TSchema>(schema: T) =>
  Type.Unsafe<Static<T>>(Type.Ref(schema.$id!));

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
  WORKFLOW = "workflow",
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
    connectHub: Type.Union([
      Type.Literal("healthy"),
      Type.Literal("unhealthy"),
    ]),
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

// Query Schemas
export const PaginationQuerySchema = Type.Object({
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
  offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
});
