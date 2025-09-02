import { FastifyTypeBox } from "../types/fastify.js";
import {
  ConnectionSchema,
  ConnectionListEndpoint,
  ConnectionStatusSchema,
  ConnectionUpdateEndpoint,
} from "../models/connection.js";
import { connections } from "../database/schema.js";
import { eq, and } from "drizzle-orm";
import { registry } from "../integrations.js";
import { Type } from "@sinclair/typebox";
import {
  FastifyRequestTypeBox,
  FastifyReplyTypeBox,
} from "../types/fastify.js";
import { Ref } from "../models/shared.js";
import { getAuth } from "@clerk/fastify";


export async function connectionRoutes(app: FastifyTypeBox) {
  app.addSchema(ConnectionStatusSchema);
  app.addSchema(ConnectionSchema);

  // List connections endpoint
  app.get(
    "/connections",
    {
      schema: ConnectionListEndpoint,
    },
    async (
      request: FastifyRequestTypeBox<typeof ConnectionListEndpoint>,
      reply: FastifyReplyTypeBox<typeof ConnectionListEndpoint>,
    ) => {
      const { orgId, userId } = getAuth(request);
      const dbConnections = await request.server.db
        .select({
          id: connections.id,
          orgId: connections.orgId,
          providerId: connections.providerId,
          permissions: connections.permissions,
          status: connections.status,
          externalAccountMetadata: connections.externalAccountMetadata,
          userId: connections.userId,
        })
        .from(connections)
        .where(
          and(eq(connections.orgId, orgId!), eq(connections.userId, userId!)),
        );

      return reply.status(200).send({
        data: dbConnections.map((dbConnection) => {
          const provider = registry.getProvider(dbConnection.providerId);
          const displayName = provider?.metadata?.displayName!;
          return {
            id: dbConnection.id,
            orgId: dbConnection.orgId,
            userId: dbConnection.userId,
            providerId: dbConnection.providerId,
            permissions: dbConnection.permissions,
            status: dbConnection.status,
            metadata: dbConnection.externalAccountMetadata || {},
            displayName: displayName,
          };
        }),
        total: dbConnections.length,
        page: 1,
        limit: dbConnections.length,
      });
    },
  );

  // Update connection endpoint (status only)
  app.patch(
    "/connections/:id",
    {
      schema: ConnectionUpdateEndpoint,
    },
    async (
      request: FastifyRequestTypeBox<typeof ConnectionUpdateEndpoint>,
      reply: FastifyReplyTypeBox<typeof ConnectionUpdateEndpoint>,
    ) => {
      try {
        const { id } = request.params;
        const { status } = request.body;

        // Update the connection status
        const updatedConnections = await request.server.db
          .update(connections)
          .set({
            status: status,
            updatedAt: new Date(),
          })
          .where(eq(connections.id, id))
          .returning({
            id: connections.id,
            orgId: connections.orgId,
            providerId: connections.providerId,
            permissions: connections.permissions,
            status: connections.status,
            externalAccountMetadata: connections.externalAccountMetadata,
            userId: connections.userId,
          });

        if (updatedConnections.length === 0) {
          return reply.status(404).send({
            error: "Connection not found",
            message: "Connection not found",
            statusCode: 404,
            timestamp: new Date().toISOString(),
          });
        }
        const updatedConnection = updatedConnections[0]!;

        const provider = registry.getProvider(updatedConnection.providerId);
        const displayName = provider?.metadata?.displayName!;
        return reply.status(200).send({
          id: updatedConnection.id,
          orgId: updatedConnection.orgId,
          providerId: updatedConnection.providerId,
          permissions: updatedConnection.permissions,
          status: updatedConnection.status,
          metadata: updatedConnection.externalAccountMetadata || {},
          displayName: displayName,
          userId: updatedConnection.userId,
        });
      } catch (error) {
        app.log.error(error, "Error updating connection:");
        return reply.status(500).send({
          error: "Internal server error",
          message: "Failed to update connection",
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    },
  );
}
