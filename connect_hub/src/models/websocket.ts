import { Type, Static } from "@sinclair/typebox";

// Base message structure for all outbound websocket messages
export const WebSocketMessageSchema = Type.Object({
  type: Type.String(),
  timestamp: Type.String({ format: "date-time" }),
  data: Type.Unknown(),
});

// Specific message types
export const NotificationMessageSchema = Type.Object({
  type: Type.Literal("notification"),
  timestamp: Type.String({ format: "date-time" }),
  data: Type.Object({
    title: Type.String(),
    message: Type.String(),
    priority: Type.Optional(
      Type.Union([
        Type.Literal("low"),
        Type.Literal("medium"),
        Type.Literal("high"),
      ])
    ),
  }),
});

export const StatusUpdateMessageSchema = Type.Object({
  type: Type.Literal("status_update"),
  timestamp: Type.String({ format: "date-time" }),
  data: Type.Object({
    status: Type.String(),
    details: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  }),
});

export const ErrorMessageSchema = Type.Object({
  type: Type.Literal("error"),
  timestamp: Type.String({ format: "date-time" }),
  data: Type.Object({
    message: Type.String(),
    code: Type.Optional(Type.String()),
  }),
});

export const PingMessageSchema = Type.Object({
  type: Type.Literal("ping"),
  timestamp: Type.String({ format: "date-time" }),
  data: Type.Object({}),
});

export const PongMessageSchema = Type.Object({
  type: Type.Literal("pong"),
  timestamp: Type.String({ format: "date-time" }),
  data: Type.Object({}),
});

// Union of all outbound message types
export const OutboundMessageSchema = Type.Union([
  NotificationMessageSchema,
  StatusUpdateMessageSchema,
  ErrorMessageSchema,
  PingMessageSchema,
  PongMessageSchema,
]);

// Incoming message schemas (from client to server)
export const ClientPingMessageSchema = Type.Object({
  type: Type.Literal("ping"),
  data: Type.Optional(Type.Object({})),
});

export const IncomingMessageSchema = Type.Union([ClientPingMessageSchema]);

// Connection info schema
export const WebSocketConnectionSchema = Type.Object({
  userId: Type.String(),
  orgId: Type.String(),
  connectedAt: Type.String({ format: "date-time" }),
});

// Type exports
export type WebSocketMessage = Static<typeof WebSocketMessageSchema>;
export type NotificationMessage = Static<typeof NotificationMessageSchema>;
export type StatusUpdateMessage = Static<typeof StatusUpdateMessageSchema>;
export type ErrorMessage = Static<typeof ErrorMessageSchema>;
export type PingMessage = Static<typeof PingMessageSchema>;
export type PongMessage = Static<typeof PongMessageSchema>;
export type OutboundMessage = Static<typeof OutboundMessageSchema>;
export type ClientPingMessage = Static<typeof ClientPingMessageSchema>;
export type IncomingMessage = Static<typeof IncomingMessageSchema>;
export type WebSocketConnection = Static<typeof WebSocketConnectionSchema>; 