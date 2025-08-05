import { FastifyTypeBox } from "../types/fastify.js";
import {
  ConnectionSchema,
  ConnectionListEndpoint,
  ConnectionStatus,
  ConnectionStatusSchema,
} from "../models/connection.js";
import { connections } from "../database/schema.js";
import { eq } from "drizzle-orm";
import { registry } from "../integrations.js";
import { Type } from "@sinclair/typebox";
import {
  FastifyRequestTypeBox,
  FastifyReplyTypeBox,
} from "../types/fastify.js";

// Schema for connection update (only status allowed)
export const ConnectionUpdateSchema = Type.Object({
  status: ConnectionStatusSchema,
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
      try {
        // Get all connections from database
        const dbConnections = await request.server.db
          .select()
          .from(connections);

        // Transform database records to API model
        const apiConnections = dbConnections.map((dbConnection) => {
          // Get provider metadata for display name
          let displayName = dbConnection.providerId;
          try {
            const provider = registry.getProvider(dbConnection.providerId);
            displayName =
              provider?.metadata?.displayName || dbConnection.providerId;
          } catch (error) {
            // If provider not found, use providerId as display name
            app.log.warn(
              `Provider ${dbConnection.providerId} not found in registry`,
            );
          }

          return {
            id: dbConnection.id,
            orgId: dbConnection.orgId,
            providerId: dbConnection.providerId,
            displayName: displayName,
            status: dbConnection.status,
            metadata: dbConnection.externalAccountMetadata || {},
          };
        });

        return reply.status(200).send(apiConnections);
      } catch (error) {
        app.log.error("Error listing connections:", error);
        return reply.status(500).send({
          error: "Internal server error",
        });
      }
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
          .returning();

        if (updatedConnections.length === 0) {
          return reply.status(404).send({
            error: "Connection not found",
          });
        }

        const dbConnection = updatedConnections[0]!;

        // Get provider metadata for display name
        let displayName = dbConnection.providerId;
        try {
          const provider = registry.getProvider(dbConnection.providerId);
          displayName =
            provider?.metadata?.displayName || dbConnection.providerId;
        } catch (error) {
          app.log.warn(
            `Provider ${dbConnection.providerId} not found in registry`,
          );
        }

        // Transform to API model
        const apiConnection = {
          id: dbConnection.id,
          orgId: dbConnection.orgId,
          providerId: dbConnection.providerId,
          displayName: displayName,
          status: dbConnection.status,
          metadata: dbConnection.externalAccountMetadata || {},
        };

        return reply.status(200).send(apiConnection);
      } catch (error) {
        app.log.error("Error updating connection:", error);
        return reply.status(500).send({
          error: "Internal server error",
        });
      }
    },
  );
}
