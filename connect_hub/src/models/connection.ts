import { Static, Type } from "@sinclair/typebox";
import { StringEnum } from "./shared.js";

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

export const ConnectionSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  orgId: Type.String(),
  providerId: Type.String({ format: "uuid" }),
  displayName: Type.String(),
  status: ConnectionStatusSchema,
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
