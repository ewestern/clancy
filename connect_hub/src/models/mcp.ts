import { Static, Type } from "@sinclair/typebox";
import { JSONSchema } from "./capabilities.js";

// ------------------------------------------------------------
// Model-Context Protocol (MCP) — minimal subset required for
// advertising available RPCs to downstream clients.
// ------------------------------------------------------------

export const RpcDescriptionSchema = Type.Object(
  {
    /** Fully-qualified rpc name e.g. "slack.chat.post" */
    name: Type.String(),

    /** Human-readable one-liner. */
    summary: Type.Optional(Type.String()),

    /** Longer description of what the RPC does. */
    description: Type.Optional(Type.String()),

    /** JSON-schema for the arguments object. */
    paramsSchema: JSONSchema,

    /** JSON-schema for the RPC result. */
    resultSchema: JSONSchema,

    /** Scopes required for the caller to invoke the RPC. */
    requiredScopes: Type.Optional(Type.Array(Type.String())),

    /** Provider identifier (e.g. slack, google) — useful metadata on the client side. */
    provider: Type.String(),
  },
  {
    $id: "RpcDescription",
  },
);

export const ServiceDescriptionSchema = Type.Object(
  {
    /** Logical service name. For ConnectHub we expose one service. */
    service: Type.String({ default: "clancy.connecthub" }),

    /** List of RPCs made available by the service. */
    rpcs: Type.Array(RpcDescriptionSchema),
  },
  {
    $id: "ServiceDescription",
  },
);

export type RpcDescription = Static<typeof RpcDescriptionSchema>;
export type ServiceDescription = Static<typeof ServiceDescriptionSchema>;
