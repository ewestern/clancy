import { Type } from "@sinclair/typebox";

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
