import { FastifyTypeBox } from "../types/fastify.js";
import { ProxyEndpointSchema } from "../models/proxy.js";
import { registry } from "../integrations.js";
import { ExecutionContext } from "../providers/types.js";
import { OwnershipScopeSchema } from "../models/capabilities.js";
import { ProviderKind } from "../models/providers.js";
import { connections, tokens } from "../database/schema.js";
import { eq, and, isNotNull } from "drizzle-orm";

export async function proxyRoutes(app: FastifyTypeBox) {
  app.addSchema(OwnershipScopeSchema);
  app.post(
    `/proxy/:providerId/:capabilityId`,
    {
      schema: ProxyEndpointSchema,
    },
    async (request, reply) => {
      console.log("Proxy request", JSON.stringify(request.body));
      const { providerId, capabilityId } = request.params;
      const { ownershipScope, ownerId, params } = request.body;

      const provider = registry.getProvider(providerId);
      if (!provider) {
        return reply.status(404).send({
          error: "Provider not found",
        });
      }

      const capability = provider.getCapability(capabilityId);
      if (!capability) {
        return reply.status(404).send({
          error: "Capability not found",
        });
      }

      // Check if capability's ownership scope matches request
      if (
        capability.meta.ownershipScope &&
        capability.meta.ownershipScope !== ownershipScope
      ) {
        return reply.status(400).send({
          error: "Ownership scope mismatch",
          message: `Capability ${capabilityId} requires ${capability.meta.ownershipScope} scope, but ${ownershipScope} was provided`,
        });
      }

      let token: Record<string, unknown> | null = null;
      if (provider.metadata.kind === ProviderKind.External) {
        // Query tokens based on ownership scope
        const results = await request.server.db
          .select({
            tokenPayload: tokens.tokenPayload,
            scopes: tokens.scopes,
          })
          .from(tokens)
          .innerJoin(connections, eq(tokens.connectionId, connections.id))
          .where(
            and(
              eq(connections.providerId, providerId),
              eq(connections.orgId, request.query.orgId),
              eq(tokens.ownershipScope, ownershipScope),
              eq(tokens.ownerId, ownerId),
              isNotNull(tokens.tokenPayload),
            ),
          );

        if (results.length === 0) {
          return reply.status(400).send({
            error: "Unauthorized",
            message: `No token found for provider ${providerId} with ${ownershipScope} scope for owner ${ownerId}`,
          });
        }

        const tokenRecord = results[0]!;

        // Check if token has required scopes
        const requiredScopes = capability.meta.requiredScopes;
        const tokenScopes = tokenRecord.scopes || [];
        const hasRequiredScopes = requiredScopes.every((scope) =>
          tokenScopes.includes(scope),
        );

        if (!hasRequiredScopes) {
          return reply.status(400).send({
            error: "Insufficient permissions",
            message: `Token lacks required scopes: ${requiredScopes.filter((scope) => !tokenScopes.includes(scope)).join(", ")}`,
          });
        }

        token = tokenRecord.tokenPayload;
      }

      const context: ExecutionContext = {
        db: request.server.db,
        orgId: request.query.orgId,
        tokenPayload: token,
        retryCount: 0,
      };

      const result = await capability.execute(params, context);
      return reply.status(200).send(result);
    },
  );
}
