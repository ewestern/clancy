import { SchemaOptions, Static, TSchema, Type } from "@sinclair/typebox";

export const Ref = <T extends TSchema>(schema: T) =>
  Type.Unsafe<Static<T>>(Type.Ref(schema.$id!));

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