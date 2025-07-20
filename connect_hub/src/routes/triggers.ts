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
import { triggerRegistrations } from "../database/schema.js";
import { registry } from "../integrations.js";
import { FastifyReply } from "fastify";
import { Value } from "@sinclair/typebox/value";

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
    handler: async (request, reply) => {
      const body = request.body;

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
        const isValid = Value.Check(trigger.paramsSchema, body.params);
        if (!isValid) {
          const errors = [...Value.Errors(trigger.paramsSchema, body.params)];
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

      const toInsert = {
        ...body,
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
      reply.status(201).send({
        id: triggerRegistration.id,
        agentId: triggerRegistration.agentId,
        providerId: triggerRegistration.providerId,
        triggerId: triggerRegistration.triggerId,
        connectionId: triggerRegistration.connectionId!, // TODO: fix this
        params: triggerRegistration.params,
        expiresAt: triggerRegistration.expiresAt.toISOString(),
        createdAt: triggerRegistration.createdAt.toISOString(),
      });
    },
  });
}
