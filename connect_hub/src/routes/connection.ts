import { FastifyTypeBox } from "../types/fastify.js";
import {
  ConnectionSchema,
  ConnectionListEndpoint,
  ConnectionStatus,
  ConnectionStatusSchema,
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

// Schema for connection update (only status allowed)
export const ConnectionUpdateSchema = Type.Object({
  status: Type.Optional(Ref(ConnectionStatusSchema)),
  employeeId: Type.Optional(Type.String()),
});

export const ConnectionUpdateEndpoint = {
  tags: ["Connection"],
  description: "Update connection status",
  params: Type.Object({
    id: Type.String({ format: "uuid" }),
  }),
  body: ConnectionUpdateSchema,
  response: {
    200: ConnectionSchema,
    404: Type.Object({
      error: Type.String(),
    }),
  },
};

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
          capabilities: connections.capabilities,
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
            capabilities: dbConnection.capabilities,
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
            capabilities: connections.capabilities,
            status: connections.status,
            externalAccountMetadata: connections.externalAccountMetadata,
            userId: connections.userId,
          });

        if (updatedConnections.length === 0) {
          return reply.status(404).send({
            error: "Connection not found",
          });
        }
        const updatedConnection = updatedConnections[0]!;

        const provider = registry.getProvider(updatedConnection.providerId);
        const displayName = provider?.metadata?.displayName!;
        return reply.status(200).send({
          id: updatedConnection.id,
          orgId: updatedConnection.orgId,
          providerId: updatedConnection.providerId,
          capabilities: updatedConnection.capabilities,
          status: updatedConnection.status,
          metadata: updatedConnection.externalAccountMetadata || {},
          displayName: displayName,
          userId: updatedConnection.userId,
        });
      } catch (error) {
        app.log.error("Error updating connection:", error);
        return reply.status(500).send({
          error: "Internal server error",
        });
      }
    },
  );
}
