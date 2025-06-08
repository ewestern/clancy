import { WebSocket } from "ws";
import { FastifyTypeBox, FastifyRequestTypeBox } from "../types/fastify.js";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { verifyToken } from "@clerk/fastify";
import {
  IncomingMessage,
  IncomingMessageSchema,
  OutboundMessage,
} from "../models/websocket.js";

// WebSocket connection schema for query parameters
const WebSocketQuerySchema = Type.Object({
  token: Type.String({ description: "Clerk JWT token for authentication" }),
});

const WebSocketEndpoint = {
  querystring: WebSocketQuerySchema,
};

export async function websocketRoutes(app: FastifyTypeBox) {
  app.get("/", {
    websocket: true,
    schema: WebSocketEndpoint,
  }, async (socket: WebSocket, request: FastifyRequestTypeBox<typeof WebSocketEndpoint>) => {
    const { token } = request.query;

    try {
      // Verify the Clerk token
      const tokenPayload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
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
      const welcomeMessage: OutboundMessage = {
        type: "status_update",
        timestamp: new Date().toISOString(),
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
      socket.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());

          // Validate incoming message structure
          if (!Value.Check(IncomingMessageSchema, parsed)) {
            const errorMessage: OutboundMessage = {
              type: "error",
              timestamp: new Date().toISOString(),
              data: {
                message: "Invalid message format",
                code: "INVALID_MESSAGE_FORMAT",
              },
            };
            socket.send(JSON.stringify(errorMessage));
            return;
          }

          // Handle specific message types
          handleIncomingMessage(parsed, userId, orgId, request.server.wsService);
        } catch (error) {
          const errorMessage: OutboundMessage = {
            type: "error",
            timestamp: new Date().toISOString(),
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
        console.error(`WebSocket error for user ${userId}:`, error);
      });

      // Handle connection close
      socket.on("close", (code, reason) => {
        console.log(
          `WebSocket closed for user ${userId}: ${code} ${reason?.toString()}`
        );
        // Connection cleanup is handled automatically by the service
      });

      console.log(`WebSocket connection established for user ${userId} in org ${orgId}`);
    } catch (error) {
      console.error("WebSocket authentication error:", error);
      socket.close(1008, "Authentication failed");
    }
  });
}

/**
 * Handle incoming messages from clients
 */
function handleIncomingMessage(
  message: IncomingMessage,
  userId: string,
  orgId: string,
  wsService: any // Will be properly typed when we update Fastify types
) {
  switch (message.type) {
    case "ping":
      // Respond to ping with pong
      wsService.sendPong(userId);
      break;

    default:
      // Unknown message type
      wsService.sendError(userId, `Unknown message type: ${message.type}`, "UNKNOWN_MESSAGE_TYPE");
      break;
  }
} 