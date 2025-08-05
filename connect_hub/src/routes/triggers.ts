import {
  FastifyReplyTypeBox,
  FastifyRequestTypeBox,
  FastifyTypeBox,
} from "../types/fastify.js";
import {
  CreateTriggerRegistrationEndpoint,
  GetTriggersEndpoint,
  TriggerRegistrationSchema,
} from "../models/triggers.js";
import { connections, triggerRegistrations } from "../database/schema.js";
import { registry } from "../integrations.js";
import { FastifyReply } from "fastify";
import { validateInput } from "../providers/utils.js";
import { eq } from "drizzle-orm";
import { and } from "drizzle-orm";
import { ConnectionStatus } from "../models/connection.js";
import { getAuth } from "@clerk/fastify";
import { ProviderKind } from "../models/providers.js";

export async function triggerRoutes(app: FastifyTypeBox) {
  app.addSchema(TriggerRegistrationSchema);

  app.get(
    "/triggers",
    {
      schema: GetTriggersEndpoint,
    },
    async (
      request: FastifyRequestTypeBox<typeof GetTriggersEndpoint>,
      reply: FastifyReplyTypeBox<typeof GetTriggersEndpoint>,
    ) => {
      const triggers = registry.getProviders().flatMap((provider) => {
        return provider.listTriggers().map((trigger) => {
          return {
            id: trigger.id,
            providerId: provider.metadata.id,
            paramsSchema: trigger.paramsSchema,
            description: trigger.description,
          };
        });
      });
      reply.status(200).send(triggers);
    },
  );

  app.post("/trigger-registrations", {
    schema: CreateTriggerRegistrationEndpoint,
    handler: async (
      request: FastifyRequestTypeBox<typeof CreateTriggerRegistrationEndpoint>,
      reply: FastifyReplyTypeBox<typeof CreateTriggerRegistrationEndpoint>,
    ) => {
      const body = request.body;
      const auth = getAuth(request);
      if (!auth.orgId || !auth.userId) {
        reply.status(401).send({
          error: "Unauthorized",
          message: "Unauthorized",
        } as any);
      }
      // Find the trigger to validate against its schema
      const provider = registry.getProvider(body.providerId);

      const trigger = provider?.getTrigger?.(body.triggerId);
      if (!trigger) {
        reply.status(400).send({
          error: "Invalid triggerId",
          message: `Trigger '${body.triggerId}' not found`,
        } as any);
        return;
      }
      // Validate metadata against trigger's paramsSchema
      if (trigger.paramsSchema && body.params) {
        try {
          validateInput(trigger.paramsSchema, body.params);
        } catch (error: any) {
          const errors = [error];
          reply.status(400).send({
            error: "Invalid trigger parameters",
            message:
              "The provided metadata does not match the trigger's parameter schema",
            details: errors.map((error) => ({
              path: error.path,
              message: error.message,
              value: error.value,
            })),
          } as any);
          return;
        }
      }
      request.log.info(
        `Creating trigger registration: ${JSON.stringify([
          auth.orgId,
          auth.userId,
          body.providerId,
          body.triggerId,
          body.params,
        ])}`,
      );
      const triggerRegistration = await request.server.db.transaction(
        async (tx) => {
          const connection = await tx.query.connections.findFirst({
            where: and(
              eq(connections.orgId, auth.orgId!),
              eq(connections.userId, auth.userId!),
              eq(connections.providerId, body.providerId),
              eq(connections.status, ConnectionStatus.Active),
            ),
          });
          if (!connection && provider?.metadata.kind === ProviderKind.External) {
            throw new Error("Connection not found");
          }
          const toInsert = {
            ...body,
            connectionId: connection?.id,
            expiresAt: new Date(body.expiresAt),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const [triggerRegistration] = await app.db
            .insert(triggerRegistrations)
            .values(toInsert)
            .returning();
          if (!triggerRegistration) {
            throw new Error("Failed to create trigger registration");
          }
          return triggerRegistration;
        },
      );

      reply.status(201).send({
        id: triggerRegistration.id,
        agentId: triggerRegistration.agentId,
        providerId: triggerRegistration.providerId,
        triggerId: triggerRegistration.triggerId,
        params: triggerRegistration.params,
        expiresAt: triggerRegistration.expiresAt.toISOString(),
        createdAt: triggerRegistration.createdAt.toISOString(),
      });
    },
  });
}
