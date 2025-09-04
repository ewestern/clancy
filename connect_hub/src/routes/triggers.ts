import {
  FastifyReplyTypeBox,
  FastifyRequestTypeBox,
  FastifyTypeBox,
} from "../types/fastify.js";
import {
  CreateTriggerRegistrationEndpoint,
  GetTriggerEndpoint,
  GetTriggerParamOptionsEndpoint,
  GetTriggersEndpoint,
  SubscribeTriggerRegistrationEndpoint,
  TriggerRegistrationSchema,
  TriggerSchema,
} from "../models/triggers.js";
import { connections, triggerRegistrations } from "../database/schema.js";
import { registry } from "../integrations.js";
import { FastifyReply } from "fastify";
import { validateInput } from "../providers/utils.js";
import { eq, and } from "drizzle-orm";
import { ConnectionStatus } from "../models/connection.js";
import { ProviderKind } from "../models/providers.js";
import { getUnifiedAuth } from "../utils/auth.js";
import { OAuthContext } from "../providers/types.js";
import { ErrorSchema } from "../models/shared.js";

export async function triggerRoutes(app: FastifyTypeBox) {
  app.addSchema(TriggerRegistrationSchema);
  app.addSchema(TriggerSchema);
  app.addSchema(ErrorSchema);

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
            displayName: trigger.displayName,
            eventDetailsSchema: trigger.eventDetailsSchema,
            optionsRequestSchema: trigger.optionsRequestSchema,
          };
        });
      });
      reply.status(200).send(triggers);
    },
  );
  app.get("/triggers/:providerId/:triggerId", {
    schema: GetTriggerEndpoint,
    handler: async (
      request: FastifyRequestTypeBox<typeof GetTriggerEndpoint>,
      reply: FastifyReplyTypeBox<typeof GetTriggerEndpoint>,
    ) => {
      const { providerId, triggerId } = request.params;
      const provider = registry.getProvider(providerId);
      const trigger = provider?.getTrigger?.(triggerId);
      if (!trigger) {
        return reply.status(404).send({
          error: "Trigger not found",
          message: "Trigger not found",
          statusCode: 404,
        });
      }
      return reply.status(200).send({
        ...trigger,
        providerId: providerId,
      });
    },
  });


  app.get("/triggers/param-options", {
    schema: GetTriggerParamOptionsEndpoint,
    handler: async (
      request: FastifyRequestTypeBox<typeof GetTriggerParamOptionsEndpoint>,
      reply: FastifyReplyTypeBox<typeof GetTriggerParamOptionsEndpoint>,
    ) => {
      const { providerId, triggerId } = request.params;
      const provider = registry.getProvider(providerId);
      const trigger = provider?.getTrigger?.(triggerId);
      if (!trigger) {
        return reply.status(404).send({
          error: "Trigger not found",
          message: "Trigger not found",
          statusCode: 404,
        });
      }
      if (!trigger.resolveTriggerParams) {
        return reply.status(400).send({
          error: "Trigger does not support parameter resolution",
          message: "Trigger does not support parameter resolution",
          statusCode: 400,
        });
      }
      const { orgId, userId } = getUnifiedAuth(request);
      if (!orgId || !userId) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Unauthorized",
          statusCode: 401,
        });
      }
      const options = await trigger.resolveTriggerParams(
        request.server.db,
        orgId!,
        userId!,
      );
      return reply.status(200).send({ options });
    },
  });
  // This is mostly for testing.
  // It
  app.post("/trigger-registrations/subscribe", {
    schema: SubscribeTriggerRegistrationEndpoint,
    handler: async (
      request: FastifyRequestTypeBox<
        typeof SubscribeTriggerRegistrationEndpoint
      >,
      reply: FastifyReplyTypeBox<typeof SubscribeTriggerRegistrationEndpoint>,
    ) => {
      const { orgId, userId } = getUnifiedAuth(request);
      const { providerId, triggerId } = request.body;
      const provider = registry.getProvider(providerId);

      const trigger = provider?.getTrigger?.(triggerId);
      if (trigger?.registerSubscription) {
        const triggerRegistration =
          await request.server.db.query.triggerRegistrations.findFirst({
            where: and(
              eq(triggerRegistrations.orgId, orgId!),
              eq(triggerRegistrations.providerId, providerId!),
              eq(triggerRegistrations.triggerId, triggerId!),
            ),
          });
        if (!triggerRegistration) {
          return reply.status(400).send({
            error: "Trigger registration not found",
            message: "Trigger registration not found",
          });
        }
        const connection = await request.server.db.query.connections.findFirst({
          where: and(
            eq(connections.orgId, orgId!),
            eq(connections.userId, userId!),
            eq(connections.providerId, providerId!),
            eq(connections.status, ConnectionStatus.Active),
          ),
        });
        if (!connection) {
          return reply.status(400).send({
            error: "Connection not found",
            message: "Connection not found",
          });
        }
        const providerSecrets = await request.server.getProviderSecrets(
          providerId!,
        );
        if (!providerSecrets) {
          throw new Error("Provider secrets not found");
        }
        const { clientId, clientSecret, redirectUri } = providerSecrets;
        const oauthContext: OAuthContext = {
          orgId: orgId!,
          provider: providerId!,
          clientId: clientId!,
          clientSecret: clientSecret!,
          redirectUri: redirectUri!,
        };
        const result = await trigger.registerSubscription(
          request.server.db,
          connection.externalAccountMetadata,
          triggerRegistration,
          oauthContext,
        );
        request.log.info(result, "subscription result");
      } else {
        return reply.status(400).send({
          error: "Trigger does not support subscriptions",
          message: "Trigger does not support subscriptions",
        });
      }
    },
  });


  app.post("/trigger-registrations", {
    schema: CreateTriggerRegistrationEndpoint,
    handler: async (
      request: FastifyRequestTypeBox<typeof CreateTriggerRegistrationEndpoint>,
      reply: FastifyReplyTypeBox<typeof CreateTriggerRegistrationEndpoint>,
    ) => {
      const body = request.body;
      request.log.info(
        `Creating trigger registration: ${JSON.stringify(body)}`,
      );
      const { orgId, userId } = getUnifiedAuth(request);
      request.log.info(`Auth info: ${JSON.stringify({ orgId, userId })}`);
      if (!orgId || !userId) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Unauthorized",
        });
      }
      // Find the trigger to validate against its schema
      const provider = registry.getProvider(body.providerId);

      const trigger = provider?.getTrigger?.(body.triggerId);
      if (!trigger) {
        return reply.status(400).send({
          error: "Invalid triggerId",
          message: `Trigger '${body.triggerId}' not found`,
        } as any);
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
          orgId,
          userId,
          body.providerId,
          body.triggerId,
          body.params,
        ])}`,
      );

      const triggerRegistration = await request.server.db.transaction(
        async (tx) => {
          const connection = await tx.query.connections.findFirst({
            where: and(
              eq(connections.orgId, orgId!),
              eq(connections.userId, userId!),
              eq(connections.providerId, body.providerId),
              eq(connections.status, ConnectionStatus.Active),
            ),
          });
          if (
            !connection &&
            provider?.metadata.kind === ProviderKind.External
          ) {
            throw new Error(
              `Connection not found: ${JSON.stringify({
                providerId: body.providerId,
              })}`,
            );
          }
          const toInsert = {
            ...body,
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
            connectionId: connection?.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const [triggerRegistration] = await tx
            .insert(triggerRegistrations)
            .values(toInsert)
            .returning();
          if (provider?.metadata.kind === ProviderKind.External) {
            try {
              const providerSecrets = await request.server.getProviderSecrets(
                body.providerId,
              );
              if (!providerSecrets) {
                throw new Error("Provider secrets not found");
              }
              const { clientId, clientSecret, redirectUri } = providerSecrets;
              const oauthContext: OAuthContext = {
                orgId: orgId,
                provider: body.providerId,
                clientId: clientId,
                clientSecret: clientSecret,
                redirectUri: redirectUri,
              };

              const subscriptionResult = await trigger?.registerSubscription?.(
                request.server.db,
                connection?.externalAccountMetadata || {},
                triggerRegistration!,
                oauthContext,
              );
              if (subscriptionResult) {
                // Update the registration with subscription metadata and actual expiration
                await tx
                  .update(triggerRegistrations)
                  .set({
                    subscriptionMetadata:
                      subscriptionResult.subscriptionMetadata,
                    expiresAt: subscriptionResult.expiresAt,
                    updatedAt: new Date(),
                  })
                  .where(eq(triggerRegistrations.id, triggerRegistration!.id));
              }
            } catch (error) {
              console.log(error, "error");
              request.log.error(error);
              throw error;
            }
          }
          if (!triggerRegistration) {
            throw new Error("Failed to create trigger registration");
          }
          return triggerRegistration;
        },
      );

      reply.status(200).send({
        id: triggerRegistration.id,
        orgId: triggerRegistration.orgId,
        agentId: triggerRegistration.agentId,
        providerId: triggerRegistration.providerId,
        triggerId: triggerRegistration.triggerId,
        params: triggerRegistration.params,
        expiresAt: triggerRegistration.expiresAt?.toISOString(),
        createdAt: triggerRegistration.createdAt.toISOString(),
      });
    },
  });
}
