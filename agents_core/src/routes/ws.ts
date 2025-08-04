import { WebSocket } from "ws";
import { FastifyTypeBox, FastifyRequestTypeBox } from "../types/fastify.js";
import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { Value } from "@sinclair/typebox/value";
import { verifyToken } from "@clerk/fastify";
import {
  WebsocketMessage,
  IncomingMessageSchema,
  OutboundMessage,
  StatusUpdateMessage,
  EventMessage,
} from "../models/websocket.js";
import { WebSocketService } from "../services/websocketService.js";
import { EventType, Event } from "@ewestern/events";
import { getCurrentTimestamp, publishToKinesis } from "../utils.js";

// WebSocket connection schema for query parameters
const WebSocketQuerySchema = Type.Object({
  token: Type.String({ description: "Clerk JWT token for authentication" }),
});

const WebSocketEndpoint = {
  querystring: WebSocketQuerySchema,
};
const Compiler = TypeCompiler.Compile(IncomingMessageSchema);

export async function websocketRoutes(app: FastifyTypeBox) {
  app.get(
    "/",
    {
      websocket: true,
      schema: WebSocketEndpoint,
    },
    async (
      socket: WebSocket,
      request: FastifyRequestTypeBox<typeof WebSocketEndpoint>,
    ) => {
      const { token } = request.query;

      try {
        // Verify the Clerk token
        const tokenPayload = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY!,
        });

        if (!tokenPayload || !tokenPayload.sub) {
          request.log.error("User ID not found in token");
          socket.close(1008, "Invalid token");
          return;
        }

        const userId = tokenPayload.sub;
        const orgId = (tokenPayload.o as Record<string, string>).id;

        if (!orgId) {
          request.log.error("Organization ID not found in token");
          socket.close(1008, "Organization ID not found in token");
          return;
        }

        // Add connection to the websocket service
        request.server.wsService.addConnection(userId, orgId, socket);

        // Send a welcome message
        const welcomeMessage: StatusUpdateMessage = {
          type: "status_update",
          timestamp: getCurrentTimestamp(),
          data: {
            status: "connected",
            details: {
              userId,
              orgId,
              connectedAt: new Date().toISOString(),
            },
          },
        };

        socket.send(JSON.stringify(welcomeMessage));

        // Handle incoming messages
        socket.on("message", async (data) => {
          try {
            const parsed = JSON.parse(data.toString());
            console.log("Parsed", JSON.stringify(parsed, null, 2));

            // Validate incoming message structure
            if (!Compiler.Check(parsed)) {
              request.log.error(
                `Invalid message ${JSON.stringify([...Compiler.Errors(parsed)])}`,
              );
              const errorMessage: OutboundMessage = {
                type: "error",
                timestamp: getCurrentTimestamp(),
                data: {
                  message: "Invalid message format",
                  code: "INVALID_MESSAGE_FORMAT",
                },
              };
              socket.send(JSON.stringify(errorMessage));
              return;
            }

            // Handle specific message types
            await handleIncomingMessage(
              parsed,
              userId,
              orgId,
              request.server.wsService,
            );
          } catch (error) {
            request.log.error(
              `Error handling message ${JSON.stringify(data)}: ${error}`,
            );
            const errorMessage: OutboundMessage = {
              type: "error",
              timestamp: getCurrentTimestamp(),
              data: {
                message: "Failed to parse message",
                code: "PARSE_ERROR",
              },
            };
            socket.send(JSON.stringify(errorMessage));
          }
        });

        // Handle connection errors
        socket.on("error", (error) => {
          request.log.error(`WebSocket error for user ${userId}:`, error);
        });

        // Handle connection close
        socket.on("close", (code, reason) => {
          request.log.info(
            `WebSocket closed for user ${userId}: ${code} ${reason?.toString()}`,
          );
          // Connection cleanup is handled automatically by the service
        });

        request.log.info(
          `WebSocket connection established for user ${userId} in org ${orgId}`,
        );
      } catch (error) {
        request.log.error(`WebSocket authentication error: ${error}`);
        socket.close(1008, "Authentication failed");
      }
    },
  );
}

/**
 * Handle incoming messages from clients
 */
async function handleIncomingMessage(
  message: WebsocketMessage,
  userId: string,
  orgId: string,
  wsService: WebSocketService,
) {
  switch (message.type) {
    case "event":
      const eventMessage = message as EventMessage;
      await handleIncomingEvent(
        eventMessage.event as Event,
        userId,
        orgId,
        wsService,
      );
      break;

    default:
      wsService.sendError(
        userId,
        `Unknown message type: ${message.type}`,
        "UNKNOWN_MESSAGE_TYPE",
      );
      break;
  }
}

/**
 * Handle incoming events from clients
 */
async function handleIncomingEvent(
  event: Event,
  userId: string,
  orgId: string,
  wsService: WebSocketService,
) {
  switch (event.type) {
    case EventType.RunIntent:
      await publishToKinesis([event], (e) => event.executionId);
      break;

    case EventType.ResumeIntent:
      await publishToKinesis([event], (e) => event.executionId);
      break;

    default:
      wsService.sendError(
        userId,
        `Unknown event type: ${event.type}`,
        "UNKNOWN_EVENT_TYPE",
      );
      break;
  }
}
