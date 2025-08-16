import { Static, Type } from "@sinclair/typebox";
import { Ref, PaginatedResponseSchema, StringEnum } from "./shared.js";

export enum ConnectionStatus {
  Active = "active",
  Inactive = "inactive",
  Error = "error",
}

export const ConnectionStatusSchema = StringEnum(
  [ConnectionStatus.Active, ConnectionStatus.Inactive, ConnectionStatus.Error],
  {
    $id: "ConnectionStatus",
  },
);

export const ConnectionSchema = Type.Object(
  {
    id: Type.String({ format: "uuid" }),
    orgId: Type.String(),
    userId: Type.String(),
    providerId: Type.String(),
    displayName: Type.String(),
    capabilities: Type.Array(Type.String()),
    status: Ref(ConnectionStatusSchema),
    metadata: Type.Record(Type.String(), Type.Any()),
  },
  { $id: "Connection" },
);

export type Connection = Static<typeof ConnectionSchema>;

export const ConnectionListEndpoint = {
  tags: ["Connection"],
  description: "Get all connections",
  security: [{ bearerAuth: [] }],
  response: {
    200: PaginatedResponseSchema(Ref(ConnectionSchema)),
    500: Type.Object({
      error: Type.String(),
    }),
  },
};
