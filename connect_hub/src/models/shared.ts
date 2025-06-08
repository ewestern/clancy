import { SchemaOptions, Static, TSchema, Type, Kind, TypeRegistry } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export const Ref = <T extends TSchema>(schema: T) =>
  Type.Unsafe<Static<T>>(Type.Ref(schema.$id!));

export const Nullable = <T extends TSchema>(schema: T) =>
  Type.Union([schema, Type.Null()]);

export const VOptional = <T extends TSchema>(schema: T) =>
  Type.Optional(Nullable(schema));


export interface TUnionOneOf<T extends TSchema[]> extends TSchema {
  [Kind]: "UnionOneOf";
  static: { [K in keyof T]: Static<T[K]> }[number];
  oneOf: T;
}
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

export const ErrorSchema = Type.Object(
  {
    error: Type.String(),
    message: Type.String(),
    statusCode: Type.Number(),
    timestamp: Type.String({ format: "date-time" }),
    path: Type.Optional(Type.String()),
    details: Type.Optional(Type.Unknown()),
  },
  { $id: "ErrorResponse" },
);

export const StringEnum = <T extends string[]>(
  values: [...T],
  opts?: SchemaOptions,
) =>
  Type.Unsafe<T[number]>({
    type: "string",
    enum: values,
    ...opts,
  });
