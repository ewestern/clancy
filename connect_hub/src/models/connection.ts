import { Static, Type } from "@sinclair/typebox";

export const ConnectionSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  orgId: Type.String(),
  providerId: Type.String({ format: "uuid" }),
  displayName: Type.String(),
  status: Type.Union([
    Type.Literal("active"),
    Type.Literal("inactive"),
    Type.Literal("error"),
  ]),
  metadata: Type.Record(Type.String(), Type.Any()),
  isActive: Type.Boolean(),
});

export type Connection = Static<typeof ConnectionSchema>;

export const ConnectionListEndpoint = {
  tags: ["Connection"],
  description: "Get all connections",
  response: {
    200: Type.Array(ConnectionSchema),
  },
};
