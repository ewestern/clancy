import { Kind, SchemaOptions, Static, TSchema, Type, TypeRegistry } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export enum EventType {
    RunIntent = "runintent",
    ResumeIntent = "resumeintent",
    StopIntent = "stopintent",
    RequestHumanFeedback = "requesthumanfeedback",
}
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

export const EventTypeWrapper = <T extends TSchema>(schema: T) =>
    Type.Intersect([
        Type.Object({
            timestamp: Type.String(),
            orgId: Type.String(),
        }),
        schema,
    ])


export const RunIntentEventSchema = Type.Object({
    type: Type.Literal(EventType.RunIntent),
    agentId: Type.String(),
})

export const GraphCreatorRunIntentEventSchema = Type.Intersect([
    RunIntentEventSchema,
    Type.Object({
        userId: Type.String(),
        jobDescription: Type.String(),  
    })
])

export const ResumeIntentEventSchema = Type.Object({
    type: Type.Literal(EventType.ResumeIntent),
    agentId: Type.String(),
    executionId: Type.String(),
})

export const TextRequestSchema = Type.Object({
    type: Type.Literal("text"),
    text: Type.String(),
})
export const OptionsRequestSchema = Type.Object({
    type: Type.Literal("options"),
    options: Type.Array(Type.String()),
})

export const RequestHumanFeedbackEventSchema = Type.Object({
    type: Type.Literal(EventType.RequestHumanFeedback),
    request: UnionOneOf([
        TextRequestSchema,
        OptionsRequestSchema,
    ])
})

export const EventSchema = EventTypeWrapper(UnionOneOf([
    GraphCreatorRunIntentEventSchema,
    ResumeIntentEventSchema,
    RequestHumanFeedbackEventSchema,
]))

export type Event = Static<typeof EventSchema>

//export type RunIntentEvent = Static<typeof GraphCreatorRunIntentEventSchema>
//export type ResumeIntentEvent = Static<typeof ResumeIntentEventSchema>  



// submit job description to connect_hub
// connect_hub should turn this into a runintent. (Possibly specialized????)
// connect hub emits runintent event.
// event pipeline routes event to graph creator
// What does graph creator need to know?
/// a) job description