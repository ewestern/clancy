import { Type, Static, TSchema } from "@sinclair/typebox";
import { EventSchema } from "@ewestern/events";

export enum WebSocketMessageType {
  Notification = "notification",
  StatusUpdate = "status_update",
  Error = "error",
  Event = "event",
}

export const EventMessageSchema = Type.Object({
  type: Type.Literal("event"),
  timestamp: Type.String(),
  event: EventSchema as unknown as TSchema,
});

export const ErrorMessageSchema = Type.Object({
  type: Type.Literal("error"),
  timestamp: Type.String(),
  data: Type.Object({
    message: Type.String(),
    code: Type.Optional(Type.String()),
  }),
});

export const StatusUpdateMessageSchema = Type.Object({
  type: Type.Literal("status_update"),
  timestamp: Type.String(),
  data: Type.Object({
    status: Type.String(),
    details: Type.Optional(Type.Record(Type.String(), Type.Any())),
  }),
});

export const NotificationMessageSchema = Type.Object({
  type: Type.Literal("notification"),
  timestamp: Type.String(),
  data: Type.Object({
    title: Type.String(),
    message: Type.String(),
    priority: Type.Optional(
      Type.Union([
        Type.Literal("low"),
        Type.Literal("medium"),
        Type.Literal("high"),
      ]),
    ),
  }),
});

export const WebsocketMessageSchema = Type.Union([
  EventMessageSchema,
  ErrorMessageSchema,
  StatusUpdateMessageSchema,
  NotificationMessageSchema,
]);

// Type aliases for backwards compatibility and clarity
export const IncomingMessageSchema = WebsocketMessageSchema;
export const OutboundMessageSchema = WebsocketMessageSchema;

export const WebSocketConnectionSchema = Type.Object({
  userId: Type.String(),
  orgId: Type.String(),
  connectedAt: Type.String({ format: "date-time" }),
});

// Static types
export type WebSocketConnection = Static<typeof WebSocketConnectionSchema>;
export type EventMessage = Static<typeof EventMessageSchema>;
export type ErrorMessage = Static<typeof ErrorMessageSchema>;
export type StatusUpdateMessage = Static<typeof StatusUpdateMessageSchema>;
export type NotificationMessage = Static<typeof NotificationMessageSchema>;
export type WebsocketMessage = Static<typeof WebsocketMessageSchema>;

// Type aliases for route compatibility
export type IncomingMessage = WebsocketMessage;
export type OutboundMessage = WebsocketMessage;
