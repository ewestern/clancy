import { WebSocket } from "ws";
import { Value } from "@sinclair/typebox/value";
import {
  OutboundMessage,
  OutboundMessageSchema,
  NotificationMessage,
  StatusUpdateMessage,
  ErrorMessage,
  PingMessage,
  PongMessage,
  WebSocketConnection,
} from "../models/websocket.js";

interface ConnectionInfo {
  ws: WebSocket;
  orgId: string;
  connectedAt: Date;
}

export class WebSocketService {
  private connections = new Map<string, ConnectionInfo[]>();

  /**
   * Add a new websocket connection for a user
   */
  addConnection(userId: string, orgId: string, ws: WebSocket): void {
    const connectionInfo: ConnectionInfo = {
      ws,
      orgId,
      connectedAt: new Date(),
    };

    if (!this.connections.has(userId)) {
      this.connections.set(userId, []);
    }

    this.connections.get(userId)!.push(connectionInfo);

    // Set up connection cleanup on close
    ws.on("close", () => {
      this.removeConnection(userId, ws);
    });

    console.log(`WebSocket connected for user ${userId} in org ${orgId}`);
  }

  /**
   * Remove a websocket connection for a user
   */
  removeConnection(userId: string, ws: WebSocket): void {
    const userConnections = this.connections.get(userId);
    if (!userConnections) return;

    const updatedConnections = userConnections.filter(
      (conn) => conn.ws !== ws
    );

    if (updatedConnections.length === 0) {
      this.connections.delete(userId);
    } else {
      this.connections.set(userId, updatedConnections);
    }

    console.log(`WebSocket disconnected for user ${userId}`);
  }

  /**
   * Send a type-safe message to a specific user
   */
  sendToUser(userId: string, message: OutboundMessage): boolean {
    // Validate message before sending
    if (!Value.Check(OutboundMessageSchema, message)) {
      console.error("Invalid websocket message format:", message);
      throw new Error("Invalid websocket message format");
    }

    const connections = this.connections.get(userId);
    if (!connections || connections.length === 0) {
      return false;
    }

    const serialized = JSON.stringify(message);
    let sentCount = 0;

    // Send to all active connections for this user
    connections.forEach((conn) => {
      if (conn.ws.readyState === WebSocket.OPEN) {
        try {
          conn.ws.send(serialized);
          sentCount++;
        } catch (error) {
          console.error(`Failed to send message to user ${userId}:`, error);
        }
      }
    });

    return sentCount > 0;
  }

  /**
   * Send a message to all users in an organization
   */
  sendToOrg(orgId: string, message: OutboundMessage): number {
    if (!Value.Check(OutboundMessageSchema, message)) {
      console.error("Invalid websocket message format:", message);
      throw new Error("Invalid websocket message format");
    }

    let sentCount = 0;
    const serialized = JSON.stringify(message);

    for (const [userId, connections] of this.connections) {
      const orgConnections = connections.filter((conn) => conn.orgId === orgId);
      
      orgConnections.forEach((conn) => {
        if (conn.ws.readyState === WebSocket.OPEN) {
          try {
            conn.ws.send(serialized);
            sentCount++;
          } catch (error) {
            console.error(`Failed to send message to user ${userId} in org ${orgId}:`, error);
          }
        }
      });
    }

    return sentCount;
  }

  /**
   * Broadcast a message to all connected users
   */
  broadcast(message: OutboundMessage): number {
    if (!Value.Check(OutboundMessageSchema, message)) {
      console.error("Invalid websocket message format:", message);
      throw new Error("Invalid websocket message format");
    }

    let sentCount = 0;
    const serialized = JSON.stringify(message);

    for (const connections of this.connections.values()) {
      connections.forEach((conn) => {
        if (conn.ws.readyState === WebSocket.OPEN) {
          try {
            conn.ws.send(serialized);
            sentCount++;
          } catch (error) {
            console.error("Failed to broadcast message:", error);
          }
        }
      });
    }

    return sentCount;
  }

  /**
   * Helper method to send a notification message
   */
  sendNotification(
    userId: string,
    title: string,
    message: string,
    priority?: "low" | "medium" | "high"
  ): boolean {
    const notification: NotificationMessage = {
      type: "notification",
      timestamp: new Date().toISOString(),
      data: { title, message, priority },
    };

    return this.sendToUser(userId, notification);
  }

  /**
   * Helper method to send a status update message
   */
  sendStatusUpdate(
    userId: string,
    status: string,
    details?: Record<string, unknown>
  ): boolean {
    const statusUpdate: StatusUpdateMessage = {
      type: "status_update",
      timestamp: new Date().toISOString(),
      data: { status, details },
    };

    return this.sendToUser(userId, statusUpdate);
  }

  /**
   * Helper method to send an error message
   */
  sendError(userId: string, message: string, code?: string): boolean {
    const error: ErrorMessage = {
      type: "error",
      timestamp: new Date().toISOString(),
      data: { message, code },
    };

    return this.sendToUser(userId, error);
  }

  /**
   * Helper method to send a ping message
   */
  sendPing(userId: string): boolean {
    const ping: PingMessage = {
      type: "ping",
      timestamp: new Date().toISOString(),
      data: {},
    };

    return this.sendToUser(userId, ping);
  }

  /**
   * Helper method to send a pong message
   */
  sendPong(userId: string): boolean {
    const pong: PongMessage = {
      type: "pong",
      timestamp: new Date().toISOString(),
      data: {},
    };

    return this.sendToUser(userId, pong);
  }

  /**
   * Check if a user has any active connections
   */
  isUserConnected(userId: string): boolean {
    const connections = this.connections.get(userId);
    if (!connections) return false;

    return connections.some((conn) => conn.ws.readyState === WebSocket.OPEN);
  }

  /**
   * Get list of all connected user IDs
   */
  getConnectedUsers(): string[] {
    const connectedUsers: string[] = [];

    for (const [userId, connections] of this.connections) {
      if (connections.some((conn) => conn.ws.readyState === WebSocket.OPEN)) {
        connectedUsers.push(userId);
      }
    }

    return connectedUsers;
  }

  /**
   * Get total count of active connections
   */
  getConnectionCount(): number {
    let count = 0;

    for (const connections of this.connections.values()) {
      count += connections.filter(
        (conn) => conn.ws.readyState === WebSocket.OPEN
      ).length;
    }

    return count;
  }

  /**
   * Get connection info for a specific user
   */
  getUserConnections(userId: string): WebSocketConnection[] {
    const connections = this.connections.get(userId);
    if (!connections) return [];

    return connections
      .filter((conn) => conn.ws.readyState === WebSocket.OPEN)
      .map((conn) => ({
        userId,
        orgId: conn.orgId,
        connectedAt: conn.connectedAt.toISOString(),
      }));
  }

  /**
   * Clean up closed connections (periodic cleanup)
   */
  cleanup(): void {
    for (const [userId, connections] of this.connections) {
      const activeConnections = connections.filter(
        (conn) => conn.ws.readyState === WebSocket.OPEN
      );

      if (activeConnections.length === 0) {
        this.connections.delete(userId);
      } else if (activeConnections.length !== connections.length) {
        this.connections.set(userId, activeConnections);
      }
    }
  }
} 